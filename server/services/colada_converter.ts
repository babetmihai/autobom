import axios from "axios"
import _ from "lodash"
import { uploadFile } from "../lib/storage"
import { COLADA_URL, TRUE } from "../lib"
import { STEP_STATUS } from "../lib/status"
import { productService } from "../lib/products"
import FormData from "form-data"


const CONVERT_TIMEOUT_MS = 5 * 60 * 1000

const client = axios.create({ baseURL: COLADA_URL })

const check = async () => {
  const inProgress = await productService.list({ "status.colada": STEP_STATUS.PROCESSING, pageSize: 1 })
  const item = _.first(inProgress)
  const { id } = item || {}
  if (!item) return { status: null }
  return { status: STEP_STATUS.PROCESSING, id }
}

const run = async () => {
  let productId
  try {
    console.log("----> Running COLADA converter")

    const { status, id: processingId } = await check() || {}
    let product = status === STEP_STATUS.PROCESSING ? await productService.get(processingId) : null

    if (!product) {
      const products = await productService.list({
        "status.trellis": STEP_STATUS.COMPLETED,
        "status.colada": STEP_STATUS.PENDING,
        hasGlb: TRUE,
        pageSize: 1
      })
      product = _.first(products)
    }

    if (!product) {
      console.log("No products ready for COLADA conversion")
      return
    }

    const { id, name, modelGlbUrl } = product
    productId = id

    if (!modelGlbUrl) {
      await productService.update(id, { "status.colada": STEP_STATUS.FAILED })
      console.log("----> COLADA conversion failed, no modelGlbUrl:", id)
      return
    }

    await productService.update(id, { "status.colada": STEP_STATUS.PROCESSING })
    console.log("Converting GLB to COLADA zip for product:", id)

    const { data: glbData } = await axios.get(modelGlbUrl, { responseType: "arraybuffer" })
    const glbBytes = Buffer.from(glbData)
    const form = new FormData()
    form.append("glb", glbBytes, `${id}.glb`)
    form.append("name", name)
    const { data: zipData } = await client.post("/convert", form, {
      headers: form.getHeaders(),
      responseType: "arraybuffer",
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      timeout: CONVERT_TIMEOUT_MS
    })
    const zipBytes = Buffer.from(zipData)

    const modelBundleUrl = await uploadFile(
      `models/${id}/bundle.zip`,
      zipBytes,
      "application/zip"
    )

    await productService.update(id, {
      modelBundleUrl,
      hasBundle: TRUE,
      "status.colada": STEP_STATUS.COMPLETED
    })

    console.log("Product name:", name)
    console.log("Model bundle URL:", modelBundleUrl)
    console.log("----> COLADA conversion completed for product:", id)
  } catch (error) {
    console.log(error.message)
    if (productId) {
      await productService.update(productId, { "status.colada": STEP_STATUS.FAILED })
    }
    console.log("----> COLADA converter failed")
  }
}

const service = { run, check }

export default service
