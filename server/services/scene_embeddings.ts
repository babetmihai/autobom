import _ from "lodash"
import axios from "axios"
import cleanDeep from "clean-deep"
import { EMBEDDING_ANALYZER_URL, TRUE } from "../lib"
import { STEP_STATUS } from "../lib/status"
import { findSimilarProducts } from "../lib/vector_search"
import { claimNext, completeStep, failStep, findOwnProcessing } from "../lib/claim"


const ANALYZE_TIMEOUT_MS = 3 * 60 * 1000
const STEP = "matching"

const embeddingClient = axios.create({ baseURL: EMBEDDING_ANALYZER_URL })

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

    const { id, url, createdBy } = scene
    sceneId = id

    if (!url) {
      await failStep("scenes", id, STEP)
      console.log("----> Scene embedding matching failed, no url:", id)
      return { status: null }
    }

    const storedCrops = scene.crops || []

    if (_.isEmpty(storedCrops)) {
      await completeStep("scenes", id, STEP, cleanDeep({
        matches: [],
        hasMatching: TRUE
      }))
      console.log("----> Scene embedding matching completed for scene:", id)
      return { status: null }
    }

    const matches: {
      cropId: string
      productId: string
      score: number
    }[] = []

    for (const crop of storedCrops) {
      const { data: embedded } = await embeddingClient.post("/analyze", { url: crop.url }, {
        timeout: ANALYZE_TIMEOUT_MS
      })
      const similar = await findSimilarProducts(embedded.embedding, { createdBy })
      matches.push(...similar.map((item) => ({
        cropId: crop.id,
        productId: item.productId,
        score: item.score
      })))
    }

    await completeStep("scenes", id, STEP, cleanDeep({
      matches,
      hasMatching: TRUE
    }))

    console.log("----> Scene embedding matching completed for scene:", id)
    return { status: null }
  } catch (error) {
    console.log(error.message)
    if (sceneId) {
      await failStep("scenes", sceneId, STEP)
    }
    console.log("----> Scene embedding matching failed")
    return { status: null }
  }
}

const service = { run }

export default service
