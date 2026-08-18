import { twMerge } from "tailwind-merge"
import clsx from "clsx"

export const EMPTY_OBJECT = {}
export const EMPTY_ARRAY = []


export const cn = (...inputs) => twMerge(clsx(inputs))

export const materialCardClass = ({
  ready = false,
  generating = false,
  failed = false,
  busy = false,
  padded = true
} = {}) => cn(
  "rounded-xl transition-[box-shadow,opacity] duration-200",
  padded && "px-4 py-3",
  ready && "bg-white shadow-[0_1px_2px_rgba(60,64,67,0.15),0_1px_3px_rgba(60,64,67,0.08)]",
  ready && "hover:shadow-[0_1px_3px_rgba(60,64,67,0.2),0_4px_8px_rgba(60,64,67,0.12)]",
  generating && "border border-amber-200 bg-white",
  failed && "border border-red-200 bg-white",
  !ready && !generating && !failed && "border border-dashed border-gray-300 bg-gray-50",
  busy && "opacity-70"
)

export const materialStatusTone = ({
  ready = false,
  generating = false,
  failed = false
} = {}) => {
  let statusClass = "text-gray-500"
  let dotClass = "bg-gray-400"
  let avatarClass = "bg-gray-100 text-gray-400"
  if (ready) {
    statusClass = "text-green-700"
    dotClass = "bg-green-600"
    avatarClass = "bg-brand-50 text-brand-700"
  }
  if (generating) {
    statusClass = "text-amber-700"
    dotClass = "bg-amber-500"
    avatarClass = "bg-amber-50 text-amber-700"
  }
  if (failed) {
    statusClass = "text-red-600"
    dotClass = "bg-red-500"
    avatarClass = "bg-red-50 text-red-600"
  }
  return { statusClass, dotClass, avatarClass }
}

export const TRUE = "TRUE"
export const FALSE = "FALSE"

export const STEP_STATUS = {
  PENDING: "PENDING",
  PROCESSING: "PROCESSING",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED"
}

export const DEFAULT_SCENE_STATUS = {
  detection: STEP_STATUS.PENDING
}

export const PRODUCT_SOURCE = {
  URL: "URL"
}

export const DEFAULT_PRODUCT_STATUS = {
  scrape: STEP_STATUS.COMPLETED,
  analysis: STEP_STATUS.PENDING
}

export const URL_IMPORT_PRODUCT_STATUS = {
  scrape: STEP_STATUS.PENDING
}
