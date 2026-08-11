import React from "react"
import { createPortal } from "react-dom"
import { cn } from "../lib/index.js"
import { hideModal } from "../lib/modals.js"
import { CloseIcon } from "./Icons.jsx"


export default function AppModal({
  name,
  children,
  footer,
  onClose = hideModal,
  className,
  contentClassName
}) {
  React.useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [onClose])

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 bg-neutral-900/40"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={name}
        className={cn(
          "relative z-10 flex max-h-[min(36rem,calc(100vh-2rem))] w-full max-w-[28rem]",
          "flex-col overflow-hidden rounded-lg border border-neutral-200 bg-white",
          "shadow-[0_8px_30px_rgba(0,0,0,0.12)]",
          className
        )}
      >
        <div className="flex shrink-0 items-center gap-3 border-b border-neutral-200 px-4 py-3">
          <h2 className="m-0 min-w-0 flex-1 text-[1rem] font-semibold text-neutral-800">
            {name}
          </h2>
          <button
            type="button"
            className={cn(
              "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md",
              "text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800"
            )}
            onClick={onClose}
            aria-label="Close"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </div>
        <div className={cn("min-h-0 flex-1 overflow-auto px-4 py-4", contentClassName)}>
          {children}
        </div>
        {footer &&
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-neutral-200 bg-white px-4 py-3">
            {footer}
          </div>
        }
      </div>
    </div>,
    document.body
  )
}
