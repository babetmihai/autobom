import { ActionIcon, Tooltip } from "@mantine/core"
import { IconBox, IconFileZip, IconPlus } from "@tabler/icons-react"
import { useTranslation } from "react-i18next"
import {
  addOrImportProduct,
  importProductBundle,
  importProductGlb
} from "../lib/products.js"
import { useLoader } from "../lib/loaders.js"

export default function ProductActions({
  view,
  inSketchup = true,
  glbSupported = true
}) {
  const { t } = useTranslation()
  const { id: productId, glbUrl, bundleUrl } = view || {}
  const importingGlb = useLoader(productId ? `importingModel.glb.${productId}` : "")
  const importingDae = useLoader(productId ? `importingModel.dae.${productId}` : "")

  if (!productId) return null

  const useGlbImport = inSketchup && Boolean(glbUrl) && glbSupported
  const useBundleImport = inSketchup && !useGlbImport && Boolean(bundleUrl)
  const glbBlocked = inSketchup && Boolean(glbUrl) && !glbSupported && !bundleUrl
  const canPrimary = useGlbImport || useBundleImport
  const importingPrimary = (useGlbImport && importingGlb) || (useBundleImport && importingDae)
  const importing = importingGlb || importingDae

  let insertTitle = t("no_importable_model")
  if (useGlbImport) insertTitle = t("insert_glb_model")
  if (useBundleImport) insertTitle = t("insert_collada_model")
  if (glbBlocked) insertTitle = t("glb_requires_sketchup_2025")

  const stop = (event) => event.stopPropagation()

  return (
    <div className="flex shrink-0 items-center" onClick={stop} onKeyDown={stop}>
      {inSketchup &&
        <Tooltip label={insertTitle}>
          <span>
            <ActionIcon
              variant="subtle"
              color="brand"
              size="lg"
              radius="xl"
              aria-label={insertTitle}
              disabled={!canPrimary || importing}
              loading={importingPrimary}
              onClick={() => void addOrImportProduct(view, { inSketchup, glbSupported })}
            >
              <IconPlus size={18} stroke={1.75} />
            </ActionIcon>
          </span>
        </Tooltip>
      }
      {!inSketchup && glbUrl &&
        <Tooltip label={t("download_glb_model")}>
          <span>
            <ActionIcon
              variant="subtle"
              color="brand"
              size="lg"
              radius="xl"
              aria-label={t("download_glb_model")}
              disabled={importing}
              loading={importingGlb}
              onClick={() => void importProductGlb(view)}
            >
              <IconBox size={18} stroke={1.75} />
            </ActionIcon>
          </span>
        </Tooltip>
      }
      {!inSketchup && bundleUrl &&
        <Tooltip label={t("download_collada_bundle")}>
          <span>
            <ActionIcon
              variant="subtle"
              color="brand"
              size="lg"
              radius="xl"
              aria-label={t("download_collada_bundle")}
              disabled={importing}
              loading={importingDae}
              onClick={() => void importProductBundle(view)}
            >
              <IconFileZip size={18} stroke={1.75} />
            </ActionIcon>
          </span>
        </Tooltip>
      }
    </div>
  )
}
