import { Button, Group } from "@mantine/core"
import { IconDownload, IconExternalLink, IconPencil, IconRefresh, IconTrash } from "@tabler/icons-react"
import { useTranslation } from "react-i18next"
import {
  addOrImportProduct,
  importProductBundle,
  importProductGlb,
  reprocessProduct
} from "../lib/products.js"
import { useLoader } from "../lib/loaders.js"
import { showProductModal } from "./ProductModal.jsx"
import { showBanner } from "../lib/banner/index.js"
import { cn } from "../lib/index.js"

export default function ProductPageActions({
  view,
  inSketchup = true,
  glbSupported = true,
  className,
  isDeleting = false,
  onDelete
}) {
  const { t } = useTranslation()
  const { id: productId, glbUrl, bundleUrl, productUrl } = view || {}
  const importingGlb = useLoader(productId ? `importingModel.glb.${productId}` : "")
  const importingDae = useLoader(productId ? `importingModel.dae.${productId}` : "")

  if (!productId) return null

  const useGlbImport = inSketchup && Boolean(glbUrl) && glbSupported
  const useBundleImport = inSketchup && !useGlbImport && Boolean(bundleUrl)
  const glbBlocked = inSketchup && Boolean(glbUrl) && !glbSupported && !bundleUrl
  const canPrimary = useGlbImport || useBundleImport
  const importingPrimary = (useGlbImport && importingGlb) || (useBundleImport && importingDae)
  const importing = importingGlb || importingDae
  const busy = importing || isDeleting

  const onReprocess = async () => {
    try {
      await reprocessProduct(view)
    } catch (error) {
      showBanner("error", error.message)
    }
  }

  const primaryLabel = (() => {
    if (useGlbImport) return t("insert_glb_model")
    if (useBundleImport) return t("insert_collada_model")
    if (glbBlocked) return t("glb_requires_sketchup_2025_short")
    return t("no_importable_model")
  })()

  const primaryTitle = (() => {
    if (useGlbImport) return t("insert_glb_model")
    if (useBundleImport) return t("insert_collada_model")
    if (glbBlocked) return t("glb_requires_sketchup_2025")
    return t("no_importable_model")
  })()

  return (
    <Group gap="xs" className={cn("flex-wrap", className)}>
      {inSketchup &&
        <Button
          color="brand"
          title={primaryTitle}
          disabled={!canPrimary || busy}
          loading={importingPrimary}
          onClick={() => void addOrImportProduct(view, { inSketchup, glbSupported })}
        >
          {primaryLabel}
        </Button>
      }
      {!inSketchup && glbUrl &&
        <Button
          variant="default"
          title={t("download_glb_model")}
          leftSection={<IconDownload size={16} stroke={1.75} />}
          disabled={busy}
          loading={importingGlb}
          onClick={() => importProductGlb(view)}
        >
          {t("glb")}
        </Button>
      }
      {!inSketchup && bundleUrl &&
        <Button
          variant="default"
          title={t("download_collada_bundle")}
          leftSection={<IconDownload size={16} stroke={1.75} />}
          disabled={busy}
          loading={importingDae}
          onClick={() => importProductBundle(view)}
        >
          {t("colada")}
        </Button>
      }
      {productUrl &&
        <Button
          component="a"
          href={productUrl}
          target="_blank"
          rel="noopener noreferrer"
          variant="default"
          title={t("view_on_store")}
          leftSection={<IconExternalLink size={16} stroke={1.75} />}
          disabled={busy}
        >
          {t("view_on_store")}
        </Button>
      }
      <Button
        variant="default"
        title={t("reprocess")}
        leftSection={<IconRefresh size={16} stroke={1.75} />}
        disabled={busy}
        onClick={() => void onReprocess()}
      >
        {t("reprocess")}
      </Button>
      <Button
        variant="default"
        title={t("edit")}
        leftSection={<IconPencil size={16} stroke={1.75} />}
        disabled={busy}
        onClick={() => showProductModal({ productId })}
      >
        {t("edit")}
      </Button>
      <Button
        variant="subtle"
        color="red"
        title={t("delete")}
        leftSection={<IconTrash size={16} stroke={1.75} />}
        disabled={busy}
        loading={isDeleting}
        onClick={onDelete}
      >
        {t("delete")}
      </Button>
    </Group>
  )
}
