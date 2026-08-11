import { twMerge } from "tailwind-merge"
import clsx from "clsx"

export const EMPTY_OBJECT = {}
export const EMPTY_ARRAY = []


export const cn = (...inputs) => twMerge(clsx(inputs))

export const TRUE = "TRUE"
export const FALSE = "FALSE"

export const STEP_STATUS = {
  PENDING: "PENDING",
  PROCESSING: "PROCESSING",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED"
}

export const DEFAULT_SCENE_STATUS = {
  detection: STEP_STATUS.PENDING,
  matching: STEP_STATUS.PENDING
}

export const PRODUCT_SOURCE = {
  URL: "URL"
}

export const DEFAULT_PRODUCT_STATUS = {
  scrape: STEP_STATUS.COMPLETED,
  image: STEP_STATUS.PENDING,
  text: STEP_STATUS.PENDING,
  embedding: STEP_STATUS.PENDING,
  trellis: STEP_STATUS.PENDING,
  colada: STEP_STATUS.PENDING
}

export const URL_IMPORT_PRODUCT_STATUS = {
  scrape: STEP_STATUS.PENDING,
  image: STEP_STATUS.PENDING,
  text: STEP_STATUS.PENDING,
  embedding: STEP_STATUS.PENDING,
  trellis: STEP_STATUS.PENDING,
  colada: STEP_STATUS.PENDING
}
