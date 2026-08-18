export const STEP_STATUS = {
  PENDING: "PENDING",
  PROCESSING: "PROCESSING",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED"
}

export type TStepStatus = typeof STEP_STATUS[keyof typeof STEP_STATUS]

export type TProductStatus = {
  scrape: TStepStatus
  analysis?: TStepStatus
  image?: TStepStatus
  text?: TStepStatus
  embedding?: TStepStatus
  trellis?: TStepStatus
  colada?: TStepStatus
}

export type TSceneStatus = {
  detection?: TStepStatus
  matching?: TStepStatus
}

export const DEFAULT_PRODUCT_STATUS: TProductStatus = {
  scrape: STEP_STATUS.COMPLETED
}

export const URL_IMPORT_PRODUCT_STATUS: TProductStatus = {
  scrape: STEP_STATUS.PENDING
}

export const DEFAULT_SCENE_STATUS: TSceneStatus = {
  detection: STEP_STATUS.PENDING
}

export const isScrapePending = (status: { scrape?: TStepStatus } | null | undefined) => {
  const { scrape } = status || {}
  return scrape === STEP_STATUS.PENDING || scrape === STEP_STATUS.PROCESSING
}
