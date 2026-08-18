import _ from "lodash"
import { SERVICES_ENABLED, WAKE_CATCHUP_SECONDS } from "./lib/index"
import { STEP_STATUS } from "./lib/status"
import { MACHINE_ID } from "./lib/machine"
import { listenWake } from "./lib/wake"
import productScraperService from "./services/product_scraper"
import productAnalyzerService from "./services/product_analyzer"
import trellisConverterService from "./services/trellis_converter"
import coladaConverterService from "./services/colada_converter"
import sceneCropsService from "./services/scene_crops"
import sceneEmbeddingsService from "./services/scene_embeddings"

type TRunResult = {
  status: string | null
  id?: string
}

type TService = {
  run: () => Promise<TRunResult | void>
}

const SERVICE_BY_NAME: Record<string, TService> = {
  product_scraper: productScraperService,
  product_analyzer: productAnalyzerService,
  trellis_converter: trellisConverterService,
  colada_converter: coladaConverterService,
  scene_crops: sceneCropsService,
  scene_embeddings: sceneEmbeddingsService
}

const PROCESSING_POLL_SECONDS = 15
const wakeCatchupSeconds = Number(WAKE_CATCHUP_SECONDS) || 120
const serviceNames = _.compact(_.map(_.split(SERVICES_ENABLED, ","), _.trim))
const services = _.map(serviceNames, (name) => {
  const service = SERVICE_BY_NAME[name]
  if (!service) throw new Error(`Unknown service in SERVICES_ENABLED: ${name}`)
  return service
})

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

let inProgress = false
let wakeAgain = false

const cycle = async (reason: string) => {
  if (inProgress) {
    wakeAgain = true
    console.log(`Ticker: cycle in progress, queuing wake (${reason})`)
    return
  }
  inProgress = true
  try {
    do {
      wakeAgain = false
      console.log(`Ticker: cycle start (${reason}) machine=${MACHINE_ID}`)
      for (const service of services) {
        let result = await service.run() || { status: null }
        while (result.status === STEP_STATUS.PROCESSING) {
          console.log("Ticker: service in progress, waiting")
          await sleep(PROCESSING_POLL_SECONDS * 1000)
          result = await service.run() || { status: null }
        }
      }
      console.log("Ticker: cycle done")
    } while (wakeAgain)
  } finally {
    inProgress = false
  }
}

const run = () => {
  if (!services.length) {
    console.log("No services enabled (set SERVICES_ENABLED in .env)")
    return
  }

  console.log(`Starting ticker machine=${MACHINE_ID} services=${serviceNames.join(", ")}`)
  console.log(`Wake-driven; catch-up every ${wakeCatchupSeconds}s`)

  listenWake(() => {
    void cycle("wake")
  })

  setInterval(() => {
    void cycle("catch-up")
  }, wakeCatchupSeconds * 1000)

  void cycle("startup")
}

console.log("Server started")
run()
