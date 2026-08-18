import { PRODUCT_SOURCE, productService } from "../lib/products"
import { scrapeProduct } from "../lib/scraper"
import { claimNext, failStep, findOwnProcessing, lockClear } from "../lib/claim"
import { wake } from "../lib/wake"

const STEP = "scrape"

const run = async () => {
  let productId
  try {
    console.log("----> Running product scraper")

    let product = await findOwnProcessing("products", STEP)
    if (!product) {
      product = await claimNext({
        collection: "products",
        step: STEP,
        listQuery: { source: PRODUCT_SOURCE.URL },
        pageSize: 1
      })
    }

    if (!product) {
      console.log("No products ready for scrape")
      return { status: null }
    }

    const { id, sourceUrl } = product
    productId = id

    if (!sourceUrl) {
      await failStep("products", id, STEP)
      console.log("----> Product scrape failed, no sourceUrl:", id)
      return { status: null }
    }

    console.log("Scraping product URL:", sourceUrl)
    await scrapeProduct(product)
    await productService.update(id, lockClear())
    await wake()
    console.log("----> Product scrape completed:", id)
    return { status: null }
  } catch (error) {
    console.error(error)
    if (productId) {
      await failStep("products", productId, STEP)
    }
    console.log("----> Product scraper failed")
    return { status: null }
  }
}

const service = { run }

export default service
