import { ActionIcon, Tooltip } from "@mantine/core"
import { IconPencil, IconPlayerPlay, IconPlus, IconRefresh, IconTrash } from "@tabler/icons-react"
import { useTranslation } from "react-i18next"
import {
  addOrImportProduct,
  getProductAnalysisView,
  isScrapePending,
  reprocessProduct
} from "../lib/products.js"
import { useLoader } from "../lib/loaders.js"
import { showProductModal } from "./ProductModal.jsx"
import { showBanner } from "../lib/banner/index.js"

export default function ProductPageActions({
  view,
  inSketchup = true,
  glbSupported = true,
  isDeleting = false,
  onDelete
}) {
  const { t } = useTranslation()
  const { id: productId, glbUrl, bundleUrl } = view || {}
  const importingGlb = useLoader(productId ? `importingModel.glb.${productId}` : "")
  const importingDae = useLoader(productId ? `importingModel.dae.${productId}` : "")
  const analysis = getProductAnalysisView(view)
  const { generating: analysisGenerating, canReanalyze } = analysis || {}
  const scrapePending = isScrapePending(view)

  if (!productId) return null

  const useGlbImport = inSketchup && Boolean(glbUrl) && glbSupported
  const useBundleImport = inSketchup && !useGlbImport && Boolean(bundleUrl)
  const glbBlocked = inSketchup && Boolean(glbUrl) && !glbSupported && !bundleUrl
  const canPrimary = useGlbImport || useBundleImport
  const importingPrimary = (useGlbImport && importingGlb) || (useBundleImport && importingDae)
  const importing = importingGlb || importingDae
  const busy = importing || isDeleting
  const analysisBusy = analysisGenerating || scrapePending

  let insertTitle = t("no_importable_model")
  if (useGlbImport) insertTitle = t("insert_glb_model")
  if (useBundleImport) insertTitle = t("insert_collada_model")
  if (glbBlocked) insertTitle = t("glb_requires_sketchup_2025")

  let analysisTitle = t("analyze")
  if (canReanalyze) analysisTitle = t("reanalyze")

  const onAnalyze = async () => {
    if (canReanalyze && !window.confirm(t("reanalyze_this_product"))) return
    try {
      await reprocessProduct(view)
    } catch (error) {
      showBanner("error", error.message)
    }
  }

  return (
    <div className="flex shrink-0 items-center">
      {inSketchup &&
        <Tooltip label={insertTitle}>
          <span>
            <ActionIcon
              variant="subtle"
              color="brand"
              size="lg"
              radius="xl"
              aria-label={insertTitle}
              disabled={!canPrimary || busy}
              loading={importingPrimary}
              onClick={() => void addOrImportProduct(view, { inSketchup, glbSupported })}
            >
              <IconPlus size={18} stroke={1.75} />
            </ActionIcon>
          </span>
        </Tooltip>
      }
      <Tooltip label={t("edit")}>
        <span>
          <ActionIcon
            variant="subtle"
            color="gray"
            size="lg"
            radius="xl"
            aria-label={t("edit")}
            disabled={busy}
            onClick={() => showProductModal({ productId })}
          >
            <IconPencil size={18} stroke={1.75} />
          </ActionIcon>
        </span>
      </Tooltip>
      <Tooltip label={analysisTitle}>
        <span>
          <ActionIcon
            variant="subtle"
            color="gray"
            size="lg"
            radius="xl"
            aria-label={analysisTitle}
            disabled={busy || analysisBusy}
            onClick={() => void onAnalyze()}
          >
            {canReanalyze &&
              <IconRefresh size={18} stroke={1.75} />
            }
            {!canReanalyze &&
              <IconPlayerPlay size={18} stroke={1.75} />
            }
          </ActionIcon>
        </span>
      </Tooltip>
      <Tooltip label={t("delete")}>
        <span>
          <ActionIcon
            variant="subtle"
            color="red"
            size="lg"
            radius="xl"
            aria-label={t("delete")}
            disabled={busy}
            loading={isDeleting}
            onClick={onDelete}
          >
            <IconTrash size={18} stroke={1.75} />
          </ActionIcon>
        </span>
      </Tooltip>
    </div>
  )
}
