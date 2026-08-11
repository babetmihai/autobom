import axios from 'axios'
import FormData from 'form-data'
import objectHash from 'object-hash'
import { STEP_STATUS, type TStepStatus } from './status'
import { TRELLIS_URL } from './index'


const START_TIMEOUT_MS = 60 * 1000 // upload + queue
const PROCESS_PARAMS = {
  resolution: 512,
  steps: 12,                    // ↓ from 20
  sparse_guidance_scale: 7.5,   // keep
  slat_guidance_scale: 7.5,     // keep
  tex_guidance_scale: 2.0,      // ↑ from 1.0
  simplify: 0.90,               // ↓ slightly from 0.92
  texture_size: 1024,           // ↑ from 512 (see note below)
  max_input_size: 512
}

const client = axios.create({ baseURL: TRELLIS_URL })

const service = {
  start: async (imageUrl, options) => {
    console.log('Starting TRELLIS conversion for image:', imageUrl)

    const { data: imageBytes } = await axios.get(imageUrl, { responseType: 'arraybuffer' })
    const form = new FormData()
    form.append('image', Buffer.from(imageBytes), 'image.jpg')
    const params = {
      ...PROCESS_PARAMS,
      seed: parseInt(objectHash(imageUrl), 16) % 2147483647
    }
    for (const [key, value] of Object.entries(params)) {
      form.append(key, String(value))
    }
    const { targetMaxInches = 0 } = options || {}
    if (targetMaxInches > 0) {
      form.append('target_max_inches', String(targetMaxInches))
    }

    const { data } = await client.post('/process', form, {
      headers: form.getHeaders(),
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      timeout: START_TIMEOUT_MS
    })

    return data.request_id
  },
  status: async (requestId: string): Promise<TStepStatus> => {
    console.log('Getting TRELLIS status for request:', requestId)
    const { data, status: httpStatus } = await client.get(`/status/${requestId}`, {
      validateStatus: () => true
    })

    if (httpStatus === 404) return STEP_STATUS.FAILED 
    if (data.status === 'completed') return STEP_STATUS.COMPLETED 
    if (data.status === 'failed') return STEP_STATUS.FAILED
    return STEP_STATUS.PROCESSING
  },
  result: async (requestId, filename = 'output.glb') => {
    console.log('Getting TRELLIS result for request:', requestId, filename)
    const { data } = await client.get(`/output/${requestId}/${filename}`, {
      responseType: 'arraybuffer'
    })
    return Buffer.from(data)
  }
}

export default service
