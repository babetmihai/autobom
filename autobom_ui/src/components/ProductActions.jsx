import { ActionIcon, Button, Group } from "@mantine/core"
import { IconExternalLink, IconPencil } from "@tabler/icons-react"
import {
  addOrImportProduct,
  importProductBundle,
  importProductGlb
} from "../lib/products.js"
import InsertButton from "./InsertButton.jsx"
import { useLoader } from "../lib/loaders.js"
import { showProductModal } from "./ProductModal.jsx"
import { cn } from "../lib/index.js"

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

  const stop = (event) => event.stopPropagation()

  return (
    <Group
      gap={4}
      justify="flex-end"
      wrap="nowrap"
      className={cn(
        "shrink-0",
        !inline && "border-t border-gray-100 bg-gray-50 px-2 py-1.5",
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
        <Button
          size="compact-xs"
          variant="default"
          title="Download GLB model"
          loading={importingGlb}
          disabled={importing}
          onClick={() => importProductGlb(view)}
        >
          GLB
        </Button>
      }
      {!inSketchup && bundleUrl &&
        <Button
          size="compact-xs"
          variant="default"
          title="Download COLLADA bundle (zip)"
          loading={importingDae}
          disabled={importing}
          onClick={() => importProductBundle(view)}
        >
          DAE
        </Button>
      }
      <ActionIcon
        variant="subtle"
        color="gray"
        size="sm"
        title="Edit product"
        onClick={(event) => {
          stop(event)
          showProductModal({ productId })
        }}
      >
        <IconPencil size={14} stroke={1.75} />
      </ActionIcon>
      {view.productUrl &&
        <ActionIcon
          component="a"
          href={view.productUrl}
          target="_blank"
          rel="noopener noreferrer"
          variant="subtle"
          color="gray"
          size="sm"
          title="View on store"
          onClick={stop}
        >
          <IconExternalLink size={14} stroke={1.75} />
        </ActionIcon>
      }
    </Group>
  )
}
