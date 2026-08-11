import path from "path"
import axios from "axios"
import _ from "lodash"
import objectHash from "object-hash"
import cleanDeep from "clean-deep"
import { TEXT_ANALYZER_URL, STEP_STATUS } from "./index"
import { ensureDownloadUrl, uploadFile } from "./storage"
import { productService } from "./products"


const EXTRACT_TIMEOUT_MS = 3 * 60 * 1000
const IMAGE_TIMEOUT_MS = 60 * 1000

const client = axios.create({ baseURL: TEXT_ANALYZER_URL })

type TExtractedProduct = {
  name?: string
  description?: string
  price?: string
  currency?: string
  sku?: string
  imageUrl?: string
  storeName?: string
  productUrl?: string
}

const saveImage = async (src: string) => {
  const cleanSrc = _.first(src.split("?")) || src
  const id = objectHash({ url: cleanSrc })
  const ext = path.extname(cleanSrc) || ".jpg"
  const dest = `images/${id}${ext}`
  const existingUrl = await ensureDownloadUrl(dest)
  if (existingUrl) return existingUrl

  const { data, headers } = await axios.get(src, {
    responseType: "arraybuffer",
    timeout: IMAGE_TIMEOUT_MS,
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; AutobomBot/1.0)"
    }
  })
  const headerType = headers["content-type"]
  let contentType = "image/jpeg"
  if (headerType && String(headerType).startsWith("image/")) contentType = String(headerType)
  else if (ext === ".png") contentType = "image/png"
  else if (ext === ".webp") contentType = "image/webp"
  return uploadFile(dest, Buffer.from(data), contentType)
}

export const scrapeProduct = async (product: {
  id: string
  sourceUrl?: string
}) => {
  const { id, sourceUrl: rawUrl } = product || {}
  const sourceUrl = (rawUrl || "").trim()
  if (!id) throw new Error("product id is required")
  if (!sourceUrl) throw new Error("sourceUrl is required")

  const { data } = await client.post<TExtractedProduct>(
    "/extract-product",
    { url: sourceUrl },
    { timeout: EXTRACT_TIMEOUT_MS }
  )
  const {
    name,
    description,
    price,
    sku,
    imageUrl: remoteImageUrl,
    storeName,
    productUrl: resolvedUrl
  } = data || {}

  if (!name) throw new Error("Extractor returned no product name")
  if (!remoteImageUrl) throw new Error("Extractor returned no product image")

  const imageUrl = await saveImage(remoteImageUrl)

  return productService.update(id, cleanDeep({
    name,
    title: name,
    description,
    sku,
    price,
    productUrl: resolvedUrl || sourceUrl,
    sourceUrl,
    storeName,
    imageUrl,
    "status.scrape": STEP_STATUS.COMPLETED
  }))
}
