import axios from "axios"
import { EMBEDDING_ANALYZER_URL, IMAGE_ANALYZER_URL, TEXT_ANALYZER_URL } from "../lib"
import { STEP_STATUS, isScrapePending } from "../lib/status"
import { PRODUCT_TAGS, hasDimensions } from "../lib/products"
import { embeddingVector } from "../lib/vector_search"
import { claimNext, completeStep, failStep, findOwnProcessing } from "../lib/claim"


const ANALYZE_TIMEOUT_MS = 2 * 60 * 1000
const STEP = "analysis"

const imageClient = axios.create({ baseURL: IMAGE_ANALYZER_URL })
const textClient = axios.create({ baseURL: TEXT_ANALYZER_URL })
const embeddingClient = axios.create({ baseURL: EMBEDDING_ANALYZER_URL })

const run = async () => {
  let productId
  try {
    console.log("----> Running product analyzer")

    let product = await findOwnProcessing("products", STEP)
    if (!product) {
      product = await claimNext({
        collection: "products",
        step: STEP,
        pageSize: 1,
        ready: (item) => !isScrapePending(item.status)
      })
    }

    if (!product) {
      console.log("No products ready for analysis")
      return { status: null }
    }

    const { id, imageUrl, name, description, tags, dimensions: existingDimensions } = product
    productId = id

    if (!imageUrl) {
      await failStep("products", id, STEP)
      console.log("----> Product analysis failed, no imageUrl:", id)
      return { status: null }
    }

    const text = [name, description].filter(Boolean).join("\n")
    console.log("Analyzing product:", id, "text chars:", text.length)

    const analyzeImage = async () => {
      const { data } = await imageClient.post("/analyze", { url: imageUrl, tags: PRODUCT_TAGS }, {
        timeout: ANALYZE_TIMEOUT_MS
      })
      return data
    }

    const analyzeText = async () => {
      if (!text) return { tags: {}, dimensions: null }
      const { data } = await textClient.post("/analyze", { text, tags: PRODUCT_TAGS }, {
        timeout: ANALYZE_TIMEOUT_MS
      })
      return data
    }

    const analyzeEmbedding = async () => {
      const { data } = await embeddingClient.post("/analyze", { url: imageUrl }, {
        timeout: ANALYZE_TIMEOUT_MS
      })
      return data
    }

    const [imageResult, textResult, embeddingResult] = await Promise.all([
      analyzeImage(),
      analyzeText(),
      analyzeEmbedding()
    ])
    const { tags: imageTags, color } = imageResult || {}
    const { tags: textTags, dimensions } = textResult || {}
    const { embedding } = embeddingResult || {}

    const payload: Record<string, unknown> = {
      tags: { ...tags, ...imageTags, ...textTags },
      color,
      embedding: embeddingVector(embedding),
      "status.image": STEP_STATUS.COMPLETED,
      "status.text": STEP_STATUS.COMPLETED,
      "status.embedding": STEP_STATUS.COMPLETED
    }
    if (!hasDimensions(existingDimensions)) payload.dimensions = dimensions

    await completeStep("products", id, STEP, payload)

    console.log("----> Product analysis completed for product:", id)
    return { status: null }
  } catch (error) {
    console.error(error)
    if (productId) {
      await failStep("products", productId, STEP)
    }
    console.log("----> Product analyzer failed")
    return { status: null }
  }
}

const service = { run }

export default service
