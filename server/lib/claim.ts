import _ from "lodash"
import dayjs from "dayjs"
import { FieldValue } from "firebase-admin/firestore"
import { TRUE, LOCK_STALE_MS } from "./index"
import { STEP_STATUS } from "./status"
import { versionRef, db } from "./firebase"
import { MACHINE_ID } from "./machine"
import { productService } from "./products"
import { sceneService } from "./scenes"
import { wake } from "./wake"

type TDoc = Record<string, unknown> & {
  id?: string
  status?: Record<string, string>
  lockedBy?: string
  lockedAt?: number
  lockedStep?: string
}

type TCollection = "products" | "scenes"

type TClaimOptions = {
  collection: TCollection
  step: string
  listQuery?: Record<string, unknown>
  pageSize?: number
  ready?: (item: TDoc) => boolean
}

const staleMs = Number(LOCK_STALE_MS) || 2 * 60 * 60 * 1000

const serviceFor = (collection: TCollection) => {
  if (collection === "scenes") return sceneService
  return productService
}

export const lockClear = () => ({
  lockedBy: FieldValue.delete(),
  lockedAt: FieldValue.delete(),
  lockedStep: FieldValue.delete()
})

const isStale = (item: TDoc) => {
  const { lockedAt } = item || {}
  if (lockedAt == null) return true
  return dayjs().valueOf() - Number(lockedAt) > staleMs
}

export const findOwnProcessing = async (collection: TCollection, step: string) => {
  const service = serviceFor(collection)
  const items = await service.list({ lockedBy: MACHINE_ID, pageSize: 5 }) as TDoc[]
  return _.find(items, (item) => {
    const { lockedStep, status } = item || {}
    return lockedStep === step && (status || {})[step] === STEP_STATUS.PROCESSING
  }) || null
}

const tryClaim = async (collection: TCollection, step: string, id: string, allowStale: boolean) => {
  const ref = versionRef.collection(collection).doc(id)
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref)
    const data = snap.data() as TDoc | undefined
    if (!data) return null
    const { _active, status } = data as TDoc & { _active?: string }
    if (_active !== TRUE) return null
    const stepStatus = (status || {})[step]
    const now = dayjs().valueOf()

    const isPending = stepStatus === STEP_STATUS.PENDING
    const isStaleProcessing = stepStatus === STEP_STATUS.PROCESSING && allowStale && isStale(data)
    if (!isPending && !isStaleProcessing) return null

    tx.update(ref, {
      [`status.${step}`]: STEP_STATUS.PROCESSING,
      lockedBy: MACHINE_ID,
      lockedAt: now,
      lockedStep: step,
      updatedAt: now
    })

    return {
      ...data,
      id,
      lockedBy: MACHINE_ID,
      lockedAt: now,
      lockedStep: step,
      status: {
        ...(status || {}),
        [step]: STEP_STATUS.PROCESSING
      }
    } as TDoc
  })
}

export const claimNext = async ({
  collection,
  step,
  listQuery = {},
  pageSize = 1,
  ready
}: TClaimOptions) => {
  const service = serviceFor(collection)

  const pending = await service.list({
    ...listQuery,
    [`status.${step}`]: STEP_STATUS.PENDING,
    pageSize
  }) as TDoc[]
  const pendingCandidates = ready ? _.filter(pending, ready) : pending

  for (const candidate of pendingCandidates) {
    const { id } = candidate || {}
    if (!id) continue
    const claimed = await tryClaim(collection, step, id, false)
    if (claimed) return claimed
  }

  const processing = await service.list({
    ...listQuery,
    [`status.${step}`]: STEP_STATUS.PROCESSING,
    pageSize: 10
  }) as TDoc[]
  const staleCandidates = _.filter(processing, (item) => {
    if (!isStale(item)) return false
    if (ready && !ready(item)) return false
    return true
  })

  for (const candidate of staleCandidates) {
    const { id } = candidate || {}
    if (!id) continue
    const claimed = await tryClaim(collection, step, id, true)
    if (claimed) {
      console.log(`Reclaimed stale ${collection}/${id} step=${step}`)
      return claimed
    }
  }

  return null
}

export const completeStep = async (
  collection: TCollection,
  id: string,
  step: string,
  payload: Record<string, unknown> = {}
) => {
  const service = serviceFor(collection)
  await service.update(id, {
    ...payload,
    [`status.${step}`]: STEP_STATUS.COMPLETED,
    ...lockClear()
  })
  await wake()
}

export const failStep = async (
  collection: TCollection,
  id: string,
  step: string,
  payload: Record<string, unknown> = {}
) => {
  const service = serviceFor(collection)
  await service.update(id, {
    ...payload,
    [`status.${step}`]: STEP_STATUS.FAILED,
    ...lockClear()
  })
  await wake()
}
