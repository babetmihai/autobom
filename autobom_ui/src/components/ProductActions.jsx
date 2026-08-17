import { Button, Group } from "@mantine/core"
import { useTranslation } from "react-i18next"
import {
  addOrImportProduct,
  importProductBundle,
  importProductGlb
} from "../lib/products.js"
import InsertButton from "./InsertButton.jsx"
import { useLoader } from "../lib/loaders.js"
import { cn } from "../lib/index.js"

export default function ProductActions({
  view,
  inSketchup = true,
  glbSupported = true,
  className,
  inline = false
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

  const primaryTitle = (() => {
    if (useGlbImport) return t("insert_glb_model")
    if (useBundleImport) return t("insert_collada_model")
    if (glbBlocked) return t("glb_requires_sketchup_2025")
    return t("no_importable_model")
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
          title={t("download_glb_model")}
          loading={importingGlb}
          disabled={importing}
          onClick={() => importProductGlb(view)}
        >
          {t("glb")}
        </Button>
      }
      {!inSketchup && bundleUrl &&
        <Button
          size="compact-xs"
          variant="default"
          title={t("download_collada_bundle")}
          loading={importingDae}
          disabled={importing}
          onClick={() => importProductBundle(view)}
        >
          {t("dae")}
        </Button>
      }
    </Group>
  )
}
