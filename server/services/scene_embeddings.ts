import _ from 'lodash'
import axios from 'axios'
import cleanDeep from 'clean-deep'
import { EMBEDDING_ANALYZER_URL, TRUE } from '../lib'
import { STEP_STATUS } from '../lib/status'
import { findSimilarProducts } from '../lib/vector_search'
import { sceneService } from '../lib/scenes'


const ANALYZE_TIMEOUT_MS = 3 * 60 * 1000

const embeddingClient = axios.create({ baseURL: EMBEDDING_ANALYZER_URL })

const check = async () => {
  const inProgress = await sceneService.list({
    'status.matching': STEP_STATUS.PROCESSING,
    pageSize: 1
  })
  const item = _.first(inProgress)
  const { id } = item || {}
  if (!item) return { status: null }
  return { status: STEP_STATUS.PROCESSING, id }
}

const run = async () => {
  let sceneId
  try {
    console.log('----> Running scene embeddings')

    const { status } = await check() || {}
    if (status === STEP_STATUS.PROCESSING) {
      console.log('----> Scene embedding matching in progress...')
      return
    }

    const scenes = await sceneService.list({
      'status.detection': STEP_STATUS.COMPLETED,
      'status.matching': STEP_STATUS.PENDING,
      pageSize: 1
    })
    const scene = _.first(scenes)

    if (!scene) {
      console.log('No scenes ready for embedding matching')
      return
    }

    const { id, url, createdBy } = scene
    sceneId = id

    if (!url) {
      await sceneService.update(id, { 'status.matching': STEP_STATUS.FAILED })
      console.log('----> Scene embedding matching failed, no url:', id)
      return
    }

    const storedCrops = scene.crops || []

    if (_.isEmpty(storedCrops)) {
      await sceneService.update(id, cleanDeep({
        matches: [],
        hasMatching: TRUE,
        'status.matching': STEP_STATUS.COMPLETED
      }))
      console.log('----> Scene embedding matching completed for scene:', id)
      return
    }

    await sceneService.update(id, { 'status.matching': STEP_STATUS.PROCESSING })

    const matches: {
      cropId: string
      productId: string
      score: number
    }[] = []

    for (const crop of storedCrops) {
      const { data: embedded } = await embeddingClient.post('/analyze', { url: crop.url }, {
        timeout: ANALYZE_TIMEOUT_MS
      })
      const similar = await findSimilarProducts(embedded.embedding, { createdBy })
      matches.push(...similar.map((item) => ({
        cropId: crop.id,
        productId: item.productId,
        score: item.score
      })))
    }

    await sceneService.update(id, cleanDeep({
      matches,
      hasMatching: TRUE,
      'status.matching': STEP_STATUS.COMPLETED
    }))

    console.log('----> Scene embedding matching completed for scene:', id)
  } catch (error) {
    console.log(error.message)
    if (sceneId) {
      await sceneService.update(sceneId, { 'status.matching': STEP_STATUS.FAILED })
    }
    console.log('----> Scene embedding matching failed')
  }
}

const service = { run, check }

export default service
