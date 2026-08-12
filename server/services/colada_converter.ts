import axios from "axios"
import { uploadFile } from "../lib/storage"
import { COLADA_URL, TRUE } from "../lib"
import { STEP_STATUS } from "../lib/status"
import { claimNext, completeStep, failStep, findOwnProcessing } from "../lib/claim"
import FormData from "form-data"


const CONVERT_TIMEOUT_MS = 5 * 60 * 1000
const STEP = "colada"

const client = axios.create({ baseURL: COLADA_URL })

const run = async () => {
  let productId
  try {
    console.log("----> Running COLADA converter")

    let product = await findOwnProcessing("products", STEP)
    if (!product) {
      product = await claimNext({
        collection: "products",
        step: STEP,
        listQuery: {
          "status.trellis": STEP_STATUS.COMPLETED,
          hasGlb: TRUE
        },
        pageSize: 1
      })
    }

    if (!product) {
      console.log("No products ready for COLADA conversion")
      return { status: null }
    }

    const { id, name, modelGlbUrl } = product
    productId = id

    if (!modelGlbUrl) {
      await failStep("products", id, STEP)
      console.log("----> COLADA conversion failed, no modelGlbUrl:", id)
      return { status: null }
    }

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

    await completeStep("products", id, STEP, {
      modelBundleUrl,
      hasBundle: TRUE
    })

    console.log("Product name:", name)
    console.log("Model bundle URL:", modelBundleUrl)
    console.log("----> COLADA conversion completed for product:", id)
    return { status: null }
  } catch (error) {
    console.log(error.message)
    if (productId) {
      await failStep("products", productId, STEP)
    }
    console.log("----> COLADA converter failed")
    return { status: null }
  }
}

const service = { run }

export default service
