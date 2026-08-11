import { cn } from "../lib/index.js"
import {
  addOrImportProduct,
  importProductBundle,
  importProductGlb
} from "../lib/products.js"
import { ExternalLinkIcon, LoadingSpinnerIcon, PencilIcon } from "./Icons.jsx"
import InsertButton from "./InsertButton.jsx"
import { useLoader } from "../lib/loaders.js"
import { showProductModal } from "./ProductModal.jsx"

const btnBase = cn(
  "inline-flex h-7 min-w-[2.25rem] shrink-0 items-center justify-center rounded px-1.5",
  "font-[inherit] text-[0.625rem] font-semibold tracking-wide transition-colors disabled:cursor-not-allowed"
)
const btnLoading = "cursor-not-allowed border border-transparent bg-neutral-100 text-neutral-500 disabled:opacity-100"
const btnSecondary = "border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-100 disabled:opacity-55"
const iconBtn = cn(
  "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded",
  "text-neutral-600 transition-colors hover:bg-neutral-200 hover:text-neutral-800"
)

export default function ProductActions({
  view,
  inSketchup = true,
  glbSupported = true,
  className,
  inline = false
}) {
  const productId = view?.id
  const importingGlb = useLoader(productId ? `importingModel.glb.${productId}` : "")
  const importingDae = useLoader(productId ? `importingModel.dae.${productId}` : "")

  if (!productId) return null

  const { glbUrl, bundleUrl } = view || {}
  const useGlbImport = inSketchup && Boolean(glbUrl) && glbSupported
  const useBundleImport = inSketchup && !useGlbImport && Boolean(bundleUrl)
  const glbBlocked = inSketchup && Boolean(glbUrl) && !glbSupported && !bundleUrl
  const canPrimary = useGlbImport || useBundleImport
  const importingPrimary = (useGlbImport && importingGlb) || (useBundleImport && importingDae)
  const importing = importingGlb || importingDae

  const primaryTitle = (() => {
    if (useGlbImport) return "Insert GLB model"
    if (useBundleImport) return "Insert Collada model"
    if (glbBlocked) return "GLB import requires SketchUp 2025 or newer."
    return "No importable model"
  })()

  const daeTitle = "Download COLLADA bundle (zip)"
  const glbDownloadTitle = "Download GLB model"

  const stop = (event) => event.stopPropagation()

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-end gap-1",
        !inline && "border-t border-neutral-100 bg-neutral-50 px-2 py-1.5",
        className
      )}
      onClick={stop}
    >
      {inSketchup &&
        <InsertButton
          title={primaryTitle}
          loading={importingPrimary}
          disabled={!canPrimary || importing}
          onClick={(event) => {
            stop(event)
            void addOrImportProduct(view, { inSketchup, glbSupported })
          }}
        />
      }
      {!inSketchup && glbUrl &&
        <button
          type="button"
          title={glbDownloadTitle}
          className={cn(
            btnBase,
            importingGlb && btnLoading,
            !importingGlb && btnSecondary
          )}
          onClick={() => importProductGlb(view)}
          disabled={importing}
        >
          {importingGlb && <LoadingSpinnerIcon className="h-3 w-3" />}
          {!importingGlb && "GLB"}
        </button>
      }
      {!inSketchup && bundleUrl &&
        <button
          type="button"
          title={daeTitle}
          className={cn(
            btnBase,
            importingDae && btnLoading,
            !importingDae && btnSecondary
          )}
          onClick={() => importProductBundle(view)}
          disabled={importing}
        >
          {importingDae && <LoadingSpinnerIcon className="h-3 w-3" />}
          {!importingDae && "DAE"}
        </button>
      }
      <button
        type="button"
        title="Edit product"
        className={iconBtn}
        onClick={(event) => {
          stop(event)
          showProductModal({ productId })
        }}
      >
        <PencilIcon className="h-3.5 w-3.5" />
      </button>
      {view.productUrl &&
        <a
          href={view.productUrl}
          target="_blank"
          rel="noopener noreferrer"
          title="View on store"
          className={iconBtn}
          onClick={stop}
        >
          <ExternalLinkIcon />
        </a>
      }
    </div>
  )
}
