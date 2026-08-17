import axios from "axios"
import { TEXT_ANALYZER_URL } from "../lib"
import { isScrapePending } from "../lib/status"
import { PRODUCT_TAGS, hasDimensions } from "../lib/products"
import { claimNext, completeStep, failStep, findOwnProcessing } from "../lib/claim"


const ANALYZE_TIMEOUT_MS = 2 * 60 * 1000
const STEP = "text"

const client = axios.create({ baseURL: TEXT_ANALYZER_URL })

const run = async () => {
  let productId
  try {
    console.log("----> Running text analyzer")

    let product = await findOwnProcessing("products", STEP)
    if (!product) {
      product = await claimNext({
        collection: "products",
        step: STEP,
        pageSize: 20,
        ready: (item) => !isScrapePending(item.status)
      })
    }

    if (!product) {
      console.log("No products ready for text analysis")
      return { status: null }
    }

    const { id, name, description, tags, dimensions: existingDimensions } = product
    productId = id
    const text = [name, description].filter(Boolean).join("\n")

    if (!text) {
      await failStep("products", id, STEP)
      console.log("----> Text analysis failed, no text:", id)
      return { status: null }
    }

    console.log("Analyzing text:", text.length, "chars, tags:", PRODUCT_TAGS.length)
    const { data } = await client.post("/analyze", { text, tags: PRODUCT_TAGS }, {
      timeout: ANALYZE_TIMEOUT_MS
    })
    const { tags: resultTags, dimensions } = data
    const payload = { tags: { ...tags, ...resultTags } }
    if (!hasDimensions(existingDimensions)) payload.dimensions = dimensions

    await completeStep("products", id, STEP, payload)

    console.log("----> Text analysis completed for product:", id)
    return { status: null }
  } catch (error) {
    console.log(error.message)
    if (productId) {
      await failStep("products", productId, STEP)
    }
    console.log("----> Text analyzer failed")
    return { status: null }
  }
}

const service = { run }

export default service
