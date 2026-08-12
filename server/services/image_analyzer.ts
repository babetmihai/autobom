import { IMAGE_ANALYZER_URL } from "../lib"
import { isScrapePending } from "../lib/status"
import { PRODUCT_TAGS } from "../lib/products"
import { claimNext, completeStep, failStep, findOwnProcessing } from "../lib/claim"
import axios from "axios"


const ANALYZE_TIMEOUT_MS = 2 * 60 * 1000
const STEP = "image"

const client = axios.create({ baseURL: IMAGE_ANALYZER_URL })

const run = async () => {
  let productId
  try {
    console.log("----> Running image analyzer")

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
      console.log("No products ready for image analysis")
      return { status: null }
    }

    const { id, imageUrl, tags } = product
    productId = id

    if (!imageUrl) {
      await failStep("products", id, STEP)
      console.log("----> Image analysis failed, no imageUrl:", id)
      return { status: null }
    }

    console.log("Analyzing image:", imageUrl, "tags:", PRODUCT_TAGS.length)
    const { data } = await client.post("/analyze", { url: imageUrl, tags: PRODUCT_TAGS }, {
      timeout: ANALYZE_TIMEOUT_MS
    })
    const { tags: resultTags, color } = data

    await completeStep("products", id, STEP, {
      tags: { ...tags, ...resultTags },
      color
    })

    console.log("----> Image analysis completed for product:", id)
    return { status: null }
  } catch (error) {
    console.log(error.message)
    if (productId) {
      await failStep("products", productId, STEP)
    }
    console.log("----> Image analyzer failed")
    return { status: null }
  }
}

const service = { run }

export default service
