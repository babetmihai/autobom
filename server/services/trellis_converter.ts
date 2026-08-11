import { uploadFile } from "../lib/storage"
import { TRUE } from "../lib"
import { STEP_STATUS } from "../lib/status"
import trellis from "../lib/trellis"
import _ from "lodash"
import { getNull } from "../lib/services"
import { productService } from "../lib/products"


const check = async () => {
  const products = await productService.list({
    "status.trellis": STEP_STATUS.PROCESSING,
    pageSize: 1
  })
  const item = _.first(products)
  const { id } = item || {}
  if (!item) return { status: null }
  return { status: STEP_STATUS.PROCESSING, id }
}

const run = async () => {
  let productId
  try {
    console.log("----> Running Trellis converter")

    const { status, id: processingId } = await check() || {}

    if (status === STEP_STATUS.PROCESSING) {
      const product = await productService.get(processingId)
      const { id, name, trellisRequestId } = product || {}
      productId = id

      const trellisStatus = await trellis.status(trellisRequestId)

      if (trellisStatus === STEP_STATUS.COMPLETED) {
        const glbBytes = await trellis.result(trellisRequestId, "output.glb")
        const modelGlbUrl = await uploadFile(`models/${id}.glb`, glbBytes, "model/gltf-binary")
        await productService.update(id, {
          modelGlbUrl,
          hasGlb: TRUE,
          trellisRequestId,
          "status.trellis": STEP_STATUS.COMPLETED
        })
        console.log("Product name:", name)
        console.log("Model GLB URL:", modelGlbUrl)
        console.log("----> Trellis conversion completed for product:", id)
        return
      }

      if (trellisStatus === STEP_STATUS.FAILED) {
        await productService.update(id, {
          "status.trellis": STEP_STATUS.FAILED,
          trellisRequestId: getNull()
        })
        console.log("----> Trellis conversion failed for product:", id)
        return
      }

      console.log("----> Trellis conversion in progress...")
      return
    }

    console.log("----> Starting Trellis model conversion")
    const products = await productService.list({
      "status.trellis": STEP_STATUS.PENDING,
      "status.image": STEP_STATUS.COMPLETED,
      "status.text": STEP_STATUS.COMPLETED,
      pageSize: 1
    })

    const product = _.first(products)
    if (!product) {
      console.log("No products ready for Trellis conversion")
      return
    }

    const { id, imageUrl, dimensions } = product
    productId = id

    const { width = 0, height = 0, depth = 0 } = dimensions || {}
    const maxCm = Math.max(width, height, depth)
    const targetMaxInches = maxCm > 0 ? maxCm / 2.54 : undefined
    const startedRequestId = await trellis.start(imageUrl, { targetMaxInches })
    await productService.update(id, {
      trellisRequestId: startedRequestId,
      "status.trellis": STEP_STATUS.PROCESSING
    })
    console.log("----> Trellis model conversion started for product:", id)
  } catch (error) {
    console.log(error.message)
    if (productId) {
      await productService.update(productId, { "status.trellis": STEP_STATUS.FAILED })
    }
    console.log("----> Trellis converter failed")
  }
}

const service = { run, check }

export default service
