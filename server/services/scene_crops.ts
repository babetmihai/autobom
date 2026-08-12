import axios from "axios"
import cleanDeep from "clean-deep"
import { SCENE_ANALYZER_URL, TRUE } from "../lib"
import { STEP_STATUS } from "../lib/status"
import { claimNext, completeStep, failStep, findOwnProcessing } from "../lib/claim"
import { uploadFile } from "../lib/storage"


const ANALYZE_TIMEOUT_MS = 3 * 60 * 1000
const STEP = "detection"

const sceneClient = axios.create({ baseURL: SCENE_ANALYZER_URL })

const run = async () => {
  let sceneId
  try {
    console.log("----> Running scene crops")

    let scene = await findOwnProcessing("scenes", STEP)
    if (!scene) {
      scene = await claimNext({
        collection: "scenes",
        step: STEP,
        pageSize: 1
      })
    }

    if (!scene) {
      console.log("No scenes ready for crop detection")
      return { status: null }
    }

    const { id, url } = scene
    sceneId = id

    if (!url) {
      await failStep("scenes", id, STEP)
      console.log("----> Scene crop detection failed, no url:", id)
      return { status: null }
    }

    console.log("Detecting crops in scene:", url)
    const { data: detection } = await sceneClient.post("/analyze", { url }, {
      timeout: ANALYZE_TIMEOUT_MS
    })

    const detectedCrops = detection.crops || []
    const storedCrops: {
      id: string
      url: string
      bbox: number[]
      label: string
      confidence: number
    }[] = []

    for (const crop of detectedCrops) {
      const cropId = crop.id
      const bytes = Buffer.from(crop.cropBase64, "base64")
      const dest = `scenes/${id}/crops/${cropId}.jpg`
      const cropUrl = await uploadFile(dest, bytes, "image/jpeg")
      storedCrops.push({
        id: cropId,
        url: cropUrl,
        bbox: crop.bbox,
        label: crop.label,
        confidence: crop.confidence
      })
    }

    await completeStep("scenes", id, STEP, cleanDeep({
      crops: storedCrops,
      imageWidth: detection.width,
      imageHeight: detection.height,
      hasDetection: TRUE,
      ...(storedCrops.length === 0 && {
        matches: [],
        hasMatching: TRUE,
        "status.matching": STEP_STATUS.COMPLETED
      })
    }))

    console.log("----> Scene crop detection completed for scene:", id)
    return { status: null }
  } catch (error) {
    console.log(error.message)
    if (sceneId) {
      await failStep("scenes", sceneId, STEP)
    }
    console.log("----> Scene crop detection failed")
    return { status: null }
  }
}

const service = { run }

export default service
