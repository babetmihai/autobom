import _ from "lodash"
import axios from "axios"
import cleanDeep from "clean-deep"
import { EMBEDDING_ANALYZER_URL, TRUE, FALSE } from "../lib"
import { STEP_STATUS } from "../lib/status"
import { findSimilarProducts } from "../lib/vector_search"
import { claimNext, completeStep, failStep, findOwnProcessing, lockClear } from "../lib/claim"
import { sceneService } from "../lib/scenes"
import { wake } from "../lib/wake"


const ANALYZE_TIMEOUT_MS = 3 * 60 * 1000
const STEP = "matching"

const embeddingClient = axios.create({ baseURL: EMBEDDING_ANALYZER_URL })

type TCrop = {
  id: string
  url?: string
  status?: string
}

type TMatch = {
  cropId: string
  productId: string
  score: number
}

const setCropStatus = (crops: TCrop[], cropId: string, status: string) => {
  return _.map(crops, (crop) => {
    if (crop.id !== cropId) return crop
    return { ...crop, status }
  })
}

const nextPendingCrop = (crops: TCrop[]) => {
  return _.find(crops, (crop) => crop.status === STEP_STATUS.PENDING)
    || _.find(crops, (crop) => crop.status === STEP_STATUS.PROCESSING)
    || null
}

const hasPendingCrops = (crops: TCrop[]) => {
  return _.some(crops, (crop) => crop.status === STEP_STATUS.PENDING)
}

const finishQueue = async (id: string, crops: TCrop[], matches: TMatch[]) => {
  const hasCompleted = _.some(crops, (crop) => crop.status === STEP_STATUS.COMPLETED)
  const payload = cleanDeep({
    crops,
    matches,
    hasMatching: hasCompleted ? TRUE : FALSE
  })
  if (hasPendingCrops(crops)) {
    await sceneService.update(id, {
      ...payload,
      [`status.${STEP}`]: STEP_STATUS.PENDING,
      ...lockClear()
    })
    await wake()
    return { status: null }
  }
  await completeStep("scenes", id, STEP, payload)
  return { status: null }
}

const run = async () => {
  let sceneId
  try {
    console.log("----> Running scene embeddings")

    let scene = await findOwnProcessing("scenes", STEP)
    if (!scene) {
      scene = await claimNext({
        collection: "scenes",
        step: STEP,
        listQuery: { "status.detection": STEP_STATUS.COMPLETED },
        pageSize: 1
      })
    }

    if (!scene) {
      console.log("No scenes ready for embedding matching")
      return { status: null }
    }

    const { id, createdBy } = scene
    sceneId = id
    const crops = (scene.crops || []) as TCrop[]
    const crop = nextPendingCrop(crops)

    if (!crop) {
      await completeStep("scenes", id, STEP, cleanDeep({
        matches: scene.matches || [],
        hasMatching: _.some(crops, (item) => item.status === STEP_STATUS.COMPLETED) ? TRUE : FALSE
      }))
      console.log("----> Scene embedding matching queue empty:", id)
      return { status: null }
    }

    const { id: cropId, url: cropUrl } = crop
    if (!cropUrl) {
      const latest = await sceneService.get(id) || scene
      const nextCrops = setCropStatus((latest.crops || []) as TCrop[], cropId, STEP_STATUS.FAILED)
      console.log("----> Crop matching failed, no url:", id, cropId)
      return finishQueue(id, nextCrops, (latest.matches || []) as TMatch[])
    }

    if (crop.status !== STEP_STATUS.PROCESSING) {
      await sceneService.update(id, { crops: setCropStatus(crops, cropId, STEP_STATUS.PROCESSING) })
    }

    console.log("Matching crop:", id, cropId)
    const { data: embedded } = await embeddingClient.post("/analyze", { url: cropUrl }, {
      timeout: ANALYZE_TIMEOUT_MS
    })
    const similar = await findSimilarProducts(embedded.embedding, { createdBy: String(createdBy || "") })
    const cropMatches = similar.map((item) => ({
      cropId,
      productId: item.productId,
      score: item.score
    }))

    const latest = await sceneService.get(id) || scene
    const latestCrops = setCropStatus((latest.crops || []) as TCrop[], cropId, STEP_STATUS.COMPLETED)
    const otherMatches = _.filter((latest.matches || []) as TMatch[], (item) => item.cropId !== cropId)
    const nextMatches = [...otherMatches, ...cropMatches]

    console.log("----> Crop matching completed:", id, cropId)
    return finishQueue(id, latestCrops, nextMatches)
  } catch (error) {
    console.log(error.message)
    if (sceneId) {
      const latest = await sceneService.get(sceneId)
      const crops = (latest && latest.crops) || []
      const crop = nextPendingCrop(crops as TCrop[])
      if (crop) {
        const nextCrops = setCropStatus(crops as TCrop[], crop.id, STEP_STATUS.FAILED)
        const matches = (latest && latest.matches) || []
        return finishQueue(sceneId, nextCrops, matches as TMatch[])
      }
      await failStep("scenes", sceneId, STEP)
    }
    console.log("----> Scene embedding matching failed")
    return { status: null }
  }
}

const service = { run }

export default service
