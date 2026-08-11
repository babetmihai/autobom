import React from "react"
import { cn } from "../lib/index.js"
import { actions } from "../lib/store/index.js"
import { hideModal } from "../lib/modals.js"
import { importProductFromUrl } from "../lib/products.js"
import { useLoader } from "../lib/loaders.js"
import { LoadingSpinnerIcon } from "./Icons.jsx"
import AppModal from "./AppModal.jsx"

const appActions = actions.create("app")

export default function ProductUrlImportModal({ onClose = hideModal }) {
  const importing = useLoader("products.importFromUrl")
  const [url, setUrl] = React.useState("")

  const onSubmit = async (event) => {
    event.preventDefault()
    const id = await importProductFromUrl(url)
    if (!id) return
    appActions.set("hasGlb", false)
    onClose()
  }

  return (
    <AppModal
      name="Import from URL"
      onClose={onClose}
      footer={
        <>
          <button
            type="button"
            className="ab-btn-toolbar"
            disabled={importing}
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="submit"
            form="product-url-import-form"
            className="ab-btn-brand"
            disabled={importing || !url.trim()}
          >
            {importing &&
              <LoadingSpinnerIcon className="h-4 w-4 animate-spin" />
            }
            {importing && "Adding..."}
            {!importing && "Add product"}
          </button>
        </>
      }
    >
      <form
        id="product-url-import-form"
        className="flex flex-col gap-3"
        onSubmit={onSubmit}
      >
        <label className="flex flex-col gap-1.5">
          <span className="text-[0.75rem] font-medium text-neutral-600">
            Product page URL
          </span>
          <input
            type="url"
            required
            autoFocus
            disabled={importing}
            placeholder="https://store.example/products/..."
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            className={cn(
              "w-full rounded-lg border border-neutral-200 bg-white px-3 py-2.5",
              "font-[inherit] text-[0.875rem] outline-none",
              "focus:border-brand focus:ring-[3px] focus:ring-brand/15",
              "disabled:opacity-60"
            )}
          />
        </label>
        <p className="m-0 text-[0.75rem] leading-relaxed text-neutral-500">
          Adds a product record and scrapes the page in the background.
        </p>
      </form>
    </AppModal>
  )
}
