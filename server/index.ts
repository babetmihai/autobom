import _ from "lodash"
import nodeCron from "node-cron"
import { SERVICES_ENABLED, TICKER_INTERVAL_SECONDS } from "./lib/index"
import { STEP_STATUS } from "./lib/status"
import productScraperService from "./services/product_scraper"
import trellisConverterService from "./services/trellis_converter"
import coladaConverterService from "./services/colada_converter"
import imageAnalyzerService from "./services/image_analyzer"
import textAnalyzerService from "./services/text_analyzer"
import embeddingIndexService from "./services/embedding_index"
import sceneCropsService from "./services/scene_crops"
import sceneEmbeddingsService from "./services/scene_embeddings"

type TService = {
  check: () => Promise<{ status: string | null, id?: string }>
  run: () => Promise<void>
}

const SERVICE_BY_NAME: Record<string, TService> = {
  product_scraper: productScraperService,
  image_analyzer: imageAnalyzerService,
  text_analyzer: textAnalyzerService,
  embedding_index: embeddingIndexService,
  trellis_converter: trellisConverterService,
  colada_converter: coladaConverterService,
  scene_crops: sceneCropsService,
  scene_embeddings: sceneEmbeddingsService
}

const intervalSeconds = Number(TICKER_INTERVAL_SECONDS)
const serviceNames = _.compact(_.map(_.split(SERVICES_ENABLED, ","), _.trim))
const services = _.map(serviceNames, (name) => {
  const service = SERVICE_BY_NAME[name]
  if (!service) throw new Error(`Unknown service in SERVICES_ENABLED: ${name}`)
  return service
})

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

let inProgress = false

const cycle = async () => {
  if (inProgress) {
    console.log("Ticker: cycle in progress, skipping")
    return
  }
  inProgress = true
  try {
    for (const service of services) {
      await service.run()
      let check = await service.check() || {}
      while (check.status === STEP_STATUS.PROCESSING) {
        console.log("Ticker: service in progress, waiting")
        await sleep(intervalSeconds * 1000)
        await service.run()
        check = await service.check() || {}
      }
    }
  } finally {
    inProgress = false
  }
}

const run = () => {
  if (!services.length) {
    console.log("No services enabled (set SERVICES_ENABLED in .env)")
    return
  }
  console.log(`Starting ticker every ${intervalSeconds}s with: ${serviceNames.join(", ")}`)
  nodeCron.schedule(`*/${intervalSeconds} * * * * *`, () => cycle())
}

console.log("Server started")
run()
