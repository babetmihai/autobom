import _ from "lodash"
import { STEP_STATUS } from "../lib/status"
import { PRODUCT_SOURCE, productService } from "../lib/products"
import { scrapeProduct } from "../lib/product_import"

const check = async () => {
  const inProgress = await productService.list({
    source: PRODUCT_SOURCE.URL,
    "status.scrape": STEP_STATUS.PROCESSING,
    pageSize: 1
  })
  const item = _.first(inProgress)
  const { id } = item || {}
  if (!item) return { status: null }
  return { status: STEP_STATUS.PROCESSING, id }
}

const run = async () => {
  let productId
  try {
    console.log("----> Running product scraper")

    const { status } = await check() || {}
    if (status === STEP_STATUS.PROCESSING) {
      console.log("----> Product scrape in progress...")
      return
    }

    const products = await productService.list({
      source: PRODUCT_SOURCE.URL,
      "status.scrape": STEP_STATUS.PENDING,
      pageSize: 1
    })
    const product = _.first(products)

    if (!product) {
      console.log("No products ready for scrape")
      return
    }

    const { id, sourceUrl } = product
    productId = id

    if (!sourceUrl) {
      await productService.update(id, { "status.scrape": STEP_STATUS.FAILED })
      console.log("----> Product scrape failed, no sourceUrl:", id)
      return
    }

    await productService.update(id, { "status.scrape": STEP_STATUS.PROCESSING })
    console.log("Scraping product URL:", sourceUrl)
    await scrapeProduct(product)
    console.log("----> Product scrape completed:", id)
  } catch (error) {
    console.log(error.message)
    if (productId) {
      await productService.update(productId, { "status.scrape": STEP_STATUS.FAILED })
    }
    console.log("----> Product scraper failed")
  }
}

const service = { run, check }

export default service
