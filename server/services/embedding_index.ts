import _ from 'lodash'
import axios from 'axios'
import { EMBEDDING_ANALYZER_URL } from '../lib'
import { STEP_STATUS } from '../lib/status'
import { embeddingVector } from '../lib/vector_search'
import { productService } from '../lib/products'


const ANALYZE_TIMEOUT_MS = 2 * 60 * 1000

const client = axios.create({ baseURL: EMBEDDING_ANALYZER_URL })

const check = async () => {
  const inProgress = await productService.list({
    'status.embedding': STEP_STATUS.PROCESSING,
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
    console.log('----> Running embedding index')

    const { status } = await check() || {}
    if (status === STEP_STATUS.PROCESSING) {
      console.log('----> Embedding index in progress...')
      return
    }

    const products = await productService.list({
      'status.embedding': STEP_STATUS.PENDING,
      'status.image': STEP_STATUS.COMPLETED,
      pageSize: 1
    })
    const product = _.first(products)

    if (!product) {
      console.log('No products ready for embedding')
      return
    }

    const { id, imageUrl } = product
    productId = id

    if (!imageUrl) {
      await productService.update(id, { 'status.embedding': STEP_STATUS.FAILED })
      console.log('----> Embedding index failed, no imageUrl:', id)
      return
    }

    await productService.update(id, { 'status.embedding': STEP_STATUS.PROCESSING })

    console.log('Embedding catalog product:', imageUrl)
    const { data } = await client.post('/analyze', { url: imageUrl }, {
      timeout: ANALYZE_TIMEOUT_MS
    })
    const { embedding } = data

    await productService.update(id, {
      embedding: embeddingVector(embedding),
      'status.embedding': STEP_STATUS.COMPLETED
    })

    console.log('----> Embedding index completed for product:', id)
  } catch (error) {
    console.log(error.message)
    if (productId) {
      await productService.update(productId, { 'status.embedding': STEP_STATUS.FAILED })
    }
    console.log('----> Embedding index failed')
  }
}

const service = { run, check }

export default service
