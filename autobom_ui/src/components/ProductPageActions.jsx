import { Button, Group } from "@mantine/core"
import { IconExternalLink } from "@tabler/icons-react"
import { useTranslation } from "react-i18next"
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
  const { t } = useTranslation()
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
          title={t("download_glb_model")}
          disabled={importing}
          loading={importingGlb}
          onClick={() => importProductGlb(view)}
        >
          {t("download_glb")}
        </Button>
      }
      {!inSketchup && bundleUrl &&
        <Button
          variant="default"
          title={t("download_collada_bundle")}
          disabled={importing}
          loading={importingDae}
          onClick={() => importProductBundle(view)}
        >
          {t("download_collada_bundle_label")}
        </Button>
      }
      {view.productUrl &&
        <Button
          component="a"
          href={view.productUrl}
          target="_blank"
          rel="noopener noreferrer"
          variant="default"
          title={t("view_on_store")}
          leftSection={<IconExternalLink size={16} stroke={1.75} />}
        >
          {t("view_on_store")}
        </Button>
      }
    </Group>
  )
}
