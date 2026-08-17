import { getNull } from "../lib/services"
import { STEP_STATUS } from "../lib/status"
import { productService } from "../lib/products"
import { sceneService } from "../lib/scenes"
import { lockClear } from "../lib/claim"
import { wake } from "../lib/wake"


const PAGE_SIZE = 100

const PRODUCT_STEPS = ["image", "text", "embedding", "trellis", "colada"] as const
const SCENE_STEPS = ["detection", "matching"] as const

type TCollectionConfig = {
  name: string
  service: typeof productService
  steps: readonly string[]
}

const COLLECTIONS: TCollectionConfig[] = [
  { name: "products", service: productService, steps: PRODUCT_STEPS },
  { name: "scenes", service: sceneService, steps: SCENE_STEPS }
]

const run = async () => {
  let grandTotal = 0

  for (const { name, service, steps } of COLLECTIONS) {
    for (const stepKey of steps) {
      const statusField = `status.${stepKey}`
      let lastId = null
      let total = 0

      while (true) {
        const items = await service.list({
          [statusField]: STEP_STATUS.FAILED,
          pageSize: PAGE_SIZE,
          ...(lastId ? { lastId } : {})
        })

        if (!items.length) break

        for (const item of items) {
          const { id, name: itemName } = item || {}
          await service.update(id, {
            [statusField]: STEP_STATUS.PENDING,
            ...lockClear(),
            ...(stepKey === "trellis" ? { trellisRequestId: getNull() } : {})
          })
          const label = itemName || id
          console.log(`Reset ${name} ${stepKey} to PENDING: ${label}`)
          total++
        }

        lastId = items[items.length - 1].id
        if (items.length < PAGE_SIZE) break
      }

      grandTotal += total
    }
  }

  if (!grandTotal) {
    console.log("No failed products or scenes to reset")
  } else {
    await wake()
  }

  console.log(`Done. Reset ${grandTotal} failed items to PENDING.`)
}

run()
