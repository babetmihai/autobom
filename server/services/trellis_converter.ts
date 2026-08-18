import { uploadFile } from "../lib/storage"
import { TRUE } from "../lib"
import { STEP_STATUS } from "../lib/status"
import trellis from "../lib/trellis"
import { getNull } from "../lib/services"
import { claimNext, completeStep, failStep, findOwnProcessing } from "../lib/claim"
import { productService } from "../lib/products"
import { wake } from "../lib/wake"


const STEP = "trellis"

const run = async () => {
  let productId
  try {
    console.log("----> Running Trellis converter")

    const processing = await findOwnProcessing("products", STEP)
    if (processing) {
      const { id, name, trellisRequestId } = processing
      productId = id

      const trellisStatus = await trellis.status(trellisRequestId)

      if (trellisStatus === STEP_STATUS.COMPLETED) {
        const glbBytes = await trellis.result(trellisRequestId, "output.glb")
        const modelGlbUrl = await uploadFile(`models/${id}.glb`, glbBytes, "model/gltf-binary")
        await completeStep("products", id, STEP, {
          modelGlbUrl,
          hasGlb: TRUE,
          trellisRequestId
        })
        console.log("Product name:", name)
        console.log("Model GLB URL:", modelGlbUrl)
        console.log("----> Trellis conversion completed for product:", id)
        return { status: null }
      }

      if (trellisStatus === STEP_STATUS.FAILED) {
        await failStep("products", id, STEP, {
          trellisRequestId: getNull()
        })
        console.log("----> Trellis conversion failed for product:", id)
        return { status: null }
      }

      console.log("----> Trellis conversion in progress...")
      return { status: STEP_STATUS.PROCESSING, id }
    }

    console.log("----> Starting Trellis model conversion")
    const product = await claimNext({
      collection: "products",
      step: STEP,
      pageSize: 1,
      ready: (item) => Boolean(item.imageUrl)
    })

    if (!product) {
      console.log("No products ready for Trellis conversion")
      return { status: null }
    }

    const { id, imageUrl, dimensions } = product
    productId = id
    if (!id) return { status: null }

    const dims = (dimensions || {}) as {
      width?: number
      height?: number
      depth?: number
    }
    const { width = 0, height = 0, depth = 0 } = dims
    const maxCm = Math.max(width, height, depth)
    const targetMaxInches = maxCm > 0 ? maxCm / 2.54 : undefined
    const startedRequestId = await trellis.start(String(imageUrl || ""), { targetMaxInches })
    await productService.update(id, { trellisRequestId: startedRequestId })
    await wake()
    console.log("----> Trellis model conversion started for product:", id)
    return { status: STEP_STATUS.PROCESSING, id }
  } catch (error) {
    console.error(error)
    if (productId) {
      await failStep("products", productId, STEP)
    }
    console.log("----> Trellis converter failed")
    return { status: null }
  }
}

const service = { run }

export default service
