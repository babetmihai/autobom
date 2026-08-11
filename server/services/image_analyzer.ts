import _ from 'lodash'
import { IMAGE_ANALYZER_URL } from '../lib'
import { isScrapePending, STEP_STATUS } from '../lib/status'
import { PRODUCT_TAGS, productService } from '../lib/products'
import axios from 'axios'


const ANALYZE_TIMEOUT_MS = 2 * 60 * 1000

const client = axios.create({ baseURL: IMAGE_ANALYZER_URL })

const check = async () => {
  const inProgress = await productService.list({
    'status.image': STEP_STATUS.PROCESSING,
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
    console.log('----> Running image analyzer')

    const { status } = await check() || {}
    if (status === STEP_STATUS.PROCESSING) {
      console.log('----> Image analysis in progress...')
      return
    }

    const products = await productService.list({
      'status.image': STEP_STATUS.PENDING,
      pageSize: 20
    })
    const product = products.find((item) => !isScrapePending(item.status))

    if (!product) {
      console.log('No products ready for image analysis')
      return
    }

    const { id, imageUrl, tags } = product
    productId = id

    if (!imageUrl) {
      await productService.update(id, { 'status.image': STEP_STATUS.FAILED })
      console.log('----> Image analysis failed, no imageUrl:', id)
      return
    }

    await productService.update(id, { 'status.image': STEP_STATUS.PROCESSING })

    console.log('Analyzing image:', imageUrl, 'tags:', PRODUCT_TAGS.length)
    const { data } = await client.post('/analyze', { url: imageUrl, tags: PRODUCT_TAGS }, {
      timeout: ANALYZE_TIMEOUT_MS
    })
    const { tags: resultTags, color } = data

    await productService.update(id, {
      tags: { ...tags, ...resultTags },
      color,
      'status.image': STEP_STATUS.COMPLETED
    })

    console.log('----> Image analysis completed for product:', id)
  } catch (error) {
    console.log(error.message)
    if (productId) {
      await productService.update(productId, { 'status.image': STEP_STATUS.FAILED })
    }
    console.log('----> Image analyzer failed')
  }
}

const service = { run, check }

export default service
