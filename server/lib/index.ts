import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '../../.env') })


export const TRUE = 'TRUE'
export const FALSE = 'FALSE'

export const {
  VITE_APP_VERSION,
  TRELLIS_URL,
  COLADA_URL,
  IMAGE_ANALYZER_URL,
  SCENE_ANALYZER_URL,
  EMBEDDING_ANALYZER_URL,
  TEXT_ANALYZER_URL,
  FIREBASE_SERVICE_ACCOUNT,
  FIREBASE_CONFIG,
  SERVICES_ENABLED,
  WAKE_CATCHUP_SECONDS,
  MACHINE_ID,
  LOCK_STALE_MS
} = process.env as Record<string, string>

export {
  STEP_STATUS,
  DEFAULT_IMAGE_STATUS,
  DEFAULT_PRODUCT_STATUS,
  URL_IMPORT_PRODUCT_STATUS,
  DEFAULT_SCENE_STATUS,
  isScrapePending
} from './status'


const MIN_SEARCH_TERM = 2


const normalizeString = (string = "") => string
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase()

export const tokenize = (string = "") => normalizeString(string)
  .split(/[^a-z0-9]+/)
  .filter((word) => word.length >= MIN_SEARCH_TERM)

const getSearchIndexTerms = (string = "") => {
  const terms = new Set()
  for (const word of tokenize(string)) {
    terms.add(word)
    for (let i = MIN_SEARCH_TERM; i < word.length; i++) {
      terms.add(word.slice(0, i))
    }
  }
  return [...terms] as string[]
}

export const getSearchIndex = (...parts: string[]) => {
  const string = parts.flat().filter(Boolean).join(" ")
  const acc = {}
  for (const term of getSearchIndexTerms(string)) {
    acc[term] = TRUE
  }
  return acc
}

