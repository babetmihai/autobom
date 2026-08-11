export const STEP_STATUS = {
  PENDING: "PENDING",
  PROCESSING: "PROCESSING",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED"
}

export type TStepStatus = typeof STEP_STATUS[keyof typeof STEP_STATUS]

export type TImageStatus = {
  scrape: TStepStatus
  image: TStepStatus
  text: TStepStatus
  embedding: TStepStatus
  trellis: TStepStatus
  colada: TStepStatus
}

export type TProductStatus = TImageStatus

export type TSceneStatus = {
  detection: TStepStatus
  matching: TStepStatus
}

export const DEFAULT_IMAGE_STATUS: TImageStatus = {
  scrape: STEP_STATUS.COMPLETED,
  image: STEP_STATUS.PENDING,
  text: STEP_STATUS.PENDING,
  embedding: STEP_STATUS.PENDING,
  trellis: STEP_STATUS.PENDING,
  colada: STEP_STATUS.PENDING
}

export const DEFAULT_PRODUCT_STATUS: TProductStatus = DEFAULT_IMAGE_STATUS

export const URL_IMPORT_PRODUCT_STATUS: TProductStatus = {
  scrape: STEP_STATUS.PENDING,
  image: STEP_STATUS.PENDING,
  text: STEP_STATUS.PENDING,
  embedding: STEP_STATUS.PENDING,
  trellis: STEP_STATUS.PENDING,
  colada: STEP_STATUS.PENDING
}

export const DEFAULT_SCENE_STATUS: TSceneStatus = {
  detection: STEP_STATUS.PENDING,
  matching: STEP_STATUS.PENDING
}

export const isScrapePending = (status: { scrape?: TStepStatus } | null | undefined) => {
  const { scrape } = status || {}
  return scrape === STEP_STATUS.PENDING || scrape === STEP_STATUS.PROCESSING
}
