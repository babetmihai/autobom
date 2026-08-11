import _ from 'lodash'
import axios from 'axios'
import { TEXT_ANALYZER_URL } from '../lib'
import { isScrapePending, STEP_STATUS } from '../lib/status'
import { PRODUCT_TAGS, productService } from '../lib/products'


const ANALYZE_TIMEOUT_MS = 2 * 60 * 1000

const client = axios.create({ baseURL: TEXT_ANALYZER_URL })

const check = async () => {
  const inProgress = await productService.list({
    'status.text': STEP_STATUS.PROCESSING,
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
    console.log('----> Running text analyzer')

    const { status } = await check() || {}
    if (status === STEP_STATUS.PROCESSING) {
      console.log('----> Text analysis in progress...')
      return
    }

    const products = await productService.list({
      'status.text': STEP_STATUS.PENDING,
      pageSize: 20
    })
    const product = products.find((item) => !isScrapePending(item.status))

    if (!product) {
      console.log('No products ready for text analysis')
      return
    }

    const { id, name, description, tags } = product
    productId = id
    const text = [name, description].filter(Boolean).join('\n')

    if (!text) {
      await productService.update(id, { 'status.text': STEP_STATUS.FAILED })
      console.log('----> Text analysis failed, no text:', id)
      return
    }

    await productService.update(id, { 'status.text': STEP_STATUS.PROCESSING })

    console.log('Analyzing text:', text.length, 'chars, tags:', PRODUCT_TAGS.length)
    const { data } = await client.post('/analyze', { text, tags: PRODUCT_TAGS }, {
      timeout: ANALYZE_TIMEOUT_MS
    })
    const { tags: resultTags, dimensions } = data
    const mergedTags = { ...tags, ...resultTags }

    await productService.update(id, {
      tags: mergedTags,
      dimensions,
      'status.text': STEP_STATUS.COMPLETED
    })

    console.log('----> Text analysis completed for product:', id)
  } catch (error) {
    console.log(error.message)
    if (productId) {
      await productService.update(productId, { 'status.text': STEP_STATUS.FAILED })
    }
    console.log('----> Text analyzer failed')
  }
}

const service = { run, check }

export default service
