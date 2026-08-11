import _ from 'lodash'
import axios from 'axios'
import cleanDeep from 'clean-deep'
import { SCENE_ANALYZER_URL, TRUE } from '../lib'
import { STEP_STATUS } from '../lib/status'
import { sceneService } from '../lib/scenes'
import { uploadFile } from '../lib/storage'


const ANALYZE_TIMEOUT_MS = 3 * 60 * 1000

const sceneClient = axios.create({ baseURL: SCENE_ANALYZER_URL })

const check = async () => {
  const inProgress = await sceneService.list({
    'status.detection': STEP_STATUS.PROCESSING,
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
    console.log('----> Running scene crops')

    const { status } = await check() || {}
    if (status === STEP_STATUS.PROCESSING) {
      console.log('----> Scene crop detection in progress...')
      return
    }

    const scenes = await sceneService.list({
      'status.detection': STEP_STATUS.PENDING,
      pageSize: 1
    })
    const scene = _.first(scenes)

    if (!scene) {
      console.log('No scenes ready for crop detection')
      return
    }

    const { id, url } = scene
    sceneId = id

    if (!url) {
      await sceneService.update(id, { 'status.detection': STEP_STATUS.FAILED })
      console.log('----> Scene crop detection failed, no url:', id)
      return
    }

    await sceneService.update(id, { 'status.detection': STEP_STATUS.PROCESSING })

    console.log('Detecting crops in scene:', url)
    const { data: detection } = await sceneClient.post('/analyze', { url }, {
      timeout: ANALYZE_TIMEOUT_MS
    })

    const detectedCrops = detection.crops || []
    const storedCrops: {
      id: string
      url: string
      bbox: number[]
      label: string
      confidence: number
    }[] = []

    for (const crop of detectedCrops) {
      const cropId = crop.id
      const bytes = Buffer.from(crop.cropBase64, 'base64')
      const dest = `scenes/${id}/crops/${cropId}.jpg`
      const cropUrl = await uploadFile(dest, bytes, 'image/jpeg')
      storedCrops.push({
        id: cropId,
        url: cropUrl,
        bbox: crop.bbox,
        label: crop.label,
        confidence: crop.confidence
      })
    }

    await sceneService.update(id, cleanDeep({
      crops: storedCrops,
      imageWidth: detection.width,
      imageHeight: detection.height,
      hasDetection: TRUE,
      'status.detection': STEP_STATUS.COMPLETED,
      ...(storedCrops.length === 0 && {
        matches: [],
        hasMatching: TRUE,
        'status.matching': STEP_STATUS.COMPLETED
      })
    }))

    console.log('----> Scene crop detection completed for scene:', id)
  } catch (error) {
    console.log(error.message)
    if (sceneId) {
      await sceneService.update(sceneId, { 'status.detection': STEP_STATUS.FAILED })
    }
    console.log('----> Scene crop detection failed')
  }
}

const service = { run, check }

export default service
