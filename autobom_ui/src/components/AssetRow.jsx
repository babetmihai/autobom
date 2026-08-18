import { ActionIcon, Loader, Tooltip } from "@mantine/core"
import { IconBox, IconDownload, IconFileZip, IconPlayerPlay, IconPlus, IconRefresh } from "@tabler/icons-react"
import {
  getProductAssetView,
  importProductBundle,
  importProductGlb,
  reprocessProductAsset
} from "../lib/products.js"
import { useLoader } from "../lib/loaders.js"
import { cn, materialCardClass, materialStatusTone } from "../lib/index.js"
import { useTranslation } from "react-i18next"

const KIND_ICONS = {
  glb: IconBox,
  colada: IconFileZip
}

const CONFIRM_KEYS = {
  glb: "reprocess_this_glb",
  colada: "reprocess_this_colada"
}

const GENERATE_LABELS = {
  glb: "generate_glb",
  colada: "generate_colada"
}

export default function AssetRow({
  product,
  kind,
  inSketchup = false,
  glbSupported = true,
  plain = false
}) {
  const { t } = useTranslation()
  const view = getProductAssetView(product, kind)
  const { id, available, processing, waiting, failed, statusKey, hasGlb } = view || {}
  const KindIcon = KIND_ICONS[kind]
  const generating = processing || waiting

  let loaderKind = kind
  if (kind === "colada") loaderKind = "dae"
  const importing = useLoader(id ? `importingModel.${loaderKind}.${id}` : "")
  const deleting = useLoader(id ? `deletingAsset.${kind}.${id}` : "")
  const busy = importing || deleting
  const glbBlocked = kind === "glb" && inSketchup && !glbSupported
  const canAction = available && !busy && !glbBlocked
  const needsGlb = kind === "colada" && !hasGlb
  const canRequest = !generating && !busy && !needsGlb
  const showRefresh = available || failed
  let requestVariant = "subtle"
  let requestColor = "gray"
  if (kind === "glb" && !available) {
    requestVariant = "filled"
    requestColor = "dark"
  }
  const { statusClass, dotClass, avatarClass } = materialStatusTone({
    ready: available,
    generating,
    failed
  })

  let actionTitle = t("download")
  if (kind === "glb") actionTitle = t("download_glb_model")
  if (kind === "colada") actionTitle = t("download_collada_bundle")
  if (inSketchup && kind === "glb") actionTitle = t("insert_glb_model")
  if (inSketchup && kind === "colada") actionTitle = t("insert_collada_model")
  if (glbBlocked) actionTitle = t("glb_requires_sketchup_2025")

  let requestTitle = t(GENERATE_LABELS[kind])
  if (failed) requestTitle = t("retry")
  if (available) requestTitle = t("reprocess")
  if (needsGlb) requestTitle = t("colada_requires_glb")

  const onAction = () => {
    if (kind === "glb") {
      void importProductGlb(view)
      return
    }
    void importProductBundle(view)
  }

  const onRequest = () => {
    if (available && !window.confirm(t(CONFIRM_KEYS[kind]))) return
    void reprocessProductAsset(view, kind)
  }

  return (
    <article
      className={cn(
        plain && "px-4 py-3 hover:bg-gray-50",
        !plain && materialCardClass({ ready: available, generating, failed, busy })
      )}
    >
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
            avatarClass
          )}
        >
          {generating &&
            <Loader size={16} color="brand" />
          }
          {!generating &&
            <KindIcon size={20} stroke={1.75} />
          }
        </div>
        <div className="min-w-0 flex-1">
          <p className="m-0 truncate text-sm font-medium text-gray-900">
            {t(kind)}
          </p>
          <p className={cn("m-0 mt-0.5 flex items-center gap-1.5 text-xs leading-4", statusClass)}>
            <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", dotClass)} />
            <span className="truncate">{t(statusKey)}</span>
          </p>
        </div>
        {!generating &&
          <div className="flex shrink-0 items-center">
            {available &&
              <Tooltip label={actionTitle}>
                <span>
                  <ActionIcon
                    variant="subtle"
                    color="brand"
                    size="lg"
                    radius="xl"
                    aria-label={actionTitle}
                    disabled={!canAction}
                    loading={importing}
                    onClick={onAction}
                  >
                    {inSketchup &&
                      <IconPlus size={18} stroke={1.75} />
                    }
                    {!inSketchup &&
                      <IconDownload size={18} stroke={1.75} />
                    }
                  </ActionIcon>
                </span>
              </Tooltip>
            }
            <Tooltip label={requestTitle}>
              <span>
                <ActionIcon
                  variant={requestVariant}
                  color={requestColor}
                  size="lg"
                  radius="xl"
                  aria-label={requestTitle}
                  disabled={!canRequest}
                  loading={deleting}
                  onClick={onRequest}
                >
                  {showRefresh &&
                    <IconRefresh size={18} stroke={1.75} />
                  }
                  {!showRefresh &&
                    <IconPlayerPlay size={18} stroke={1.75} />
                  }
                </ActionIcon>
              </span>
            </Tooltip>
          </div>
        }
      </div>
    </article>
  )
}
