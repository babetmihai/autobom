import { cn } from "../lib/index.js"
import {
  addOrImportProduct,
  importProductBundle,
  importProductGlb
} from "../lib/products.js"
import { ExternalLinkIcon, LoadingSpinnerIcon } from "./Icons.jsx"
import { useLoader } from "../lib/loaders.js"

export default function ProductPageActions({
  view,
  inSketchup = true,
  glbSupported = true,
  className
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

  const primaryLabel = (() => {
    if (useGlbImport) return "Insert GLB model"
    if (useBundleImport) return "Insert Collada model"
    if (glbBlocked) return "GLB requires SketchUp 2025+"
    return "No importable model"
  })()

  const primaryTitle = (() => {
    if (useGlbImport) return "Insert GLB model"
    if (useBundleImport) return "Insert Collada model"
    if (glbBlocked) return "GLB import requires SketchUp 2025 or newer."
    return "No importable model"
  })()

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {inSketchup &&
        <button
          type="button"
          title={primaryTitle}
          disabled={!canPrimary || importing}
          className="ab-btn-brand"
          onClick={() => void addOrImportProduct(view, { inSketchup, glbSupported })}
        >
          {importingPrimary && <LoadingSpinnerIcon className="h-4 w-4" />}
          {primaryLabel}
        </button>
      }
      {!inSketchup && glbUrl &&
        <button
          type="button"
          title="Download GLB model"
          disabled={importing}
          className="ab-btn-neutral"
          onClick={() => importProductGlb(view)}
        >
          {importingGlb && <LoadingSpinnerIcon className="h-4 w-4" />}
          Download GLB
        </button>
      }
      {!inSketchup && bundleUrl &&
        <button
          type="button"
          title="Download COLLADA bundle (zip)"
          disabled={importing}
          className="ab-btn-neutral"
          onClick={() => importProductBundle(view)}
        >
          {importingDae && <LoadingSpinnerIcon className="h-4 w-4" />}
          Download COLLADA bundle
        </button>
      }
      {view.productUrl &&
        <a
          href={view.productUrl}
          target="_blank"
          rel="noopener noreferrer"
          title="View on store"
          className="ab-btn-toolbar text-neutral-700"
        >
          <ExternalLinkIcon className="h-4 w-4 shrink-0" />
          View on store
        </a>
      }
    </div>
  )
}
