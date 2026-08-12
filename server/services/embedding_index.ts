import axios from "axios"
import { EMBEDDING_ANALYZER_URL } from "../lib"
import { STEP_STATUS } from "../lib/status"
import { embeddingVector } from "../lib/vector_search"
import { claimNext, completeStep, failStep, findOwnProcessing } from "../lib/claim"


const ANALYZE_TIMEOUT_MS = 2 * 60 * 1000
const STEP = "embedding"

const client = axios.create({ baseURL: EMBEDDING_ANALYZER_URL })

const run = async () => {
  let productId
  try {
    console.log("----> Running embedding index")

    let product = await findOwnProcessing("products", STEP)
    if (!product) {
      product = await claimNext({
        collection: "products",
        step: STEP,
        listQuery: { "status.image": STEP_STATUS.COMPLETED },
        pageSize: 1
      })
    }

    if (!product) {
      console.log("No products ready for embedding")
      return { status: null }
    }

    const { id, imageUrl } = product
    productId = id

    if (!imageUrl) {
      await failStep("products", id, STEP)
      console.log("----> Embedding index failed, no imageUrl:", id)
      return { status: null }
    }

    console.log("Embedding catalog product:", imageUrl)
    const { data } = await client.post("/analyze", { url: imageUrl }, {
      timeout: ANALYZE_TIMEOUT_MS
    })
    const { embedding } = data

    await completeStep("products", id, STEP, {
      embedding: embeddingVector(embedding)
    })

    console.log("----> Embedding index completed for product:", id)
    return { status: null }
  } catch (error) {
    console.log(error.message)
    if (productId) {
      await failStep("products", productId, STEP)
    }
    console.log("----> Embedding index failed")
    return { status: null }
  }
}

const service = { run }

export default service
