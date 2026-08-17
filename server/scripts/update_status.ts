import { getNull } from "../lib/services.js"
import { STEP_STATUS } from "../lib/status.js"
import { productService } from "../lib/products.js"


const PAGE_SIZE = 100

const [collection, stepKey, beforeStatus, nextStatus] = process.argv.slice(2)

const STEP_KEYS = ["image", "text", "embedding", "trellis", "colada", "detection", "matching"]
const COLLECTIONS = {
  products: productService
}

if (!collection || !stepKey || !beforeStatus || !nextStatus) {
  console.log("Usage: tsx scripts/update_status.ts <products> <step-key> <beforeStatus> <nextStatus>")
  console.log("Step keys:", STEP_KEYS.join(", "))
  console.log("Statuses:", Object.values(STEP_STATUS).join(", "))
  process.exit(1)
}

const service = COLLECTIONS[collection as keyof typeof COLLECTIONS]

if (!service) {
  console.log("Unknown collection:", collection)
  process.exit(1)
}

if (!STEP_KEYS.includes(stepKey)) {
  console.log("Unknown step key:", stepKey)
  process.exit(1)
}

const statusField = `status.${stepKey}`

const run = async () => {
  let lastId = null
  let total = 0

  while (true) {
    const items = await service.list({
      [statusField]: beforeStatus,
      pageSize: PAGE_SIZE,
      ...(lastId ? { lastId } : {})
    })

    if (!items.length) break

    for (const { id, name } of items) {
      await service.update(id, {
        [statusField]: nextStatus,
        ...(stepKey === "trellis" && nextStatus === STEP_STATUS.PENDING ? { trellisRequestId: getNull() } : {})
      })
      const label = name || id
      console.log(`Updated ${collection} ${stepKey} to ${nextStatus}: ${label}`)
      total++
    }

    lastId = items[items.length - 1].id
    if (items.length < PAGE_SIZE) break
  }

  console.log(`Done. Updated ${total} ${collection} from ${beforeStatus} to ${nextStatus} on status.${stepKey}.`)
}

run()
