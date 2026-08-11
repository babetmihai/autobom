import { productService, hasDimensions } from '../lib/products'


const PAGE_SIZE = 100

const run = async () => {
  let lastId: string | null = null
  let productsTotal = 0

  while (true) {
    const products = await productService.list({
      pageSize: PAGE_SIZE,
      ...(lastId ? { lastId } : {})
    })

    if (!products.length) break

    for (const product of products) {
      const { id, dimensions } = product
      if (!hasDimensions(dimensions)) {
        console.log('Product missing dimensions:', id)
      }
      productsTotal++
    }

    lastId = products[products.length - 1].id
    if (products.length < PAGE_SIZE) break
  }

  console.log(`Done. Scanned ${productsTotal} product(s).`)
}

run()
