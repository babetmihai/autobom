import { Button, Group } from "@mantine/core"
import { IconExternalLink } from "@tabler/icons-react"
import {
  addOrImportProduct,
  importProductBundle,
  importProductGlb
} from "../lib/products.js"
import { useLoader } from "../lib/loaders.js"
import { cn } from "../lib/index.js"

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
    <Group gap="xs" className={cn("flex-wrap", className)}>
      {inSketchup &&
        <Button
          color="brand"
          title={primaryTitle}
          disabled={!canPrimary || importing}
          loading={importingPrimary}
          onClick={() => void addOrImportProduct(view, { inSketchup, glbSupported })}
        >
          {primaryLabel}
        </Button>
      }
      {!inSketchup && glbUrl &&
        <Button
          variant="default"
          title="Download GLB model"
          disabled={importing}
          loading={importingGlb}
          onClick={() => importProductGlb(view)}
        >
          Download GLB
        </Button>
      }
      {!inSketchup && bundleUrl &&
        <Button
          variant="default"
          title="Download COLLADA bundle (zip)"
          disabled={importing}
          loading={importingDae}
          onClick={() => importProductBundle(view)}
        >
          Download COLLADA bundle
        </Button>
      }
      {view.productUrl &&
        <Button
          component="a"
          href={view.productUrl}
          target="_blank"
          rel="noopener noreferrer"
          variant="default"
          title="View on store"
          leftSection={<IconExternalLink size={16} stroke={1.75} />}
        >
          View on store
        </Button>
      }
    </Group>
  )
}
