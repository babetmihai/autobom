import { productService } from '../lib/products'
import { embeddingVector } from '../lib/vector_search'


const PAGE_SIZE = 100

const run = async () => {
  let lastId: string | null = null
  let total = 0

  while (true) {
    const products = await productService.list({
      pageSize: PAGE_SIZE,
      ...(lastId ? { lastId } : {})
    })

    if (!products.length) break

    for (const product of products) {
      const { id, embedding } = product
      if (!embedding || Array.isArray(embedding)) {
        if (Array.isArray(embedding)) {
          await productService.update(id, { embedding: embeddingVector(embedding) })
          console.log('Converted embedding vector for product:', id)
          total++
        }
        continue
      }
    }

    lastId = products[products.length - 1].id
    if (products.length < PAGE_SIZE) break
  }

  console.log(`Done. Converted ${total} product embedding(s).`)
}

run()
