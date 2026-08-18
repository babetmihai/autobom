import _ from "lodash"
import { ActionIcon, Tooltip } from "@mantine/core"
import { IconPlayerPlay, IconRefresh, IconTrash } from "@tabler/icons-react"
import { cn, materialCardClass, STEP_STATUS } from "../../lib/index.js"
import { cropMatchingStatus, deleteCrop, requestCropMatch } from "../../lib/scenes.js"
import { useLoader } from "../../lib/loaders.js"
import MatchRow from "./MatchRow.jsx"
import { useTranslation } from "react-i18next"


export default function CropCard({
  crop,
  matches,
  productsById,
  selected,
  onSelect,
  cardRef,
  scene,
  sceneId,
  inSketchup = true,
  glbSupported = true
}) {
  const { t } = useTranslation()
  const { id, url, label, confidence } = crop || {}
  const sorted = _.orderBy(matches, "score", "desc")
    .filter((match) => (match.score || 0) >= 0.51)
    .slice(0, 5)
  const confidencePercent = confidence != null
    ? Math.round(confidence * 100)
    : null
  const stepStatus = cropMatchingStatus(crop)
  const waiting = stepStatus === STEP_STATUS.PENDING
  const processing = stepStatus === STEP_STATUS.PROCESSING
  const failed = stepStatus === STEP_STATUS.FAILED
  const completed = stepStatus === STEP_STATUS.COMPLETED
  const generating = waiting || processing
  const hasMatches = sorted.length > 0
  const matching = useLoader(sceneId && id ? `scenes.crop.${sceneId}.${id}` : "")
  const deleting = useLoader(sceneId && id ? `scenes.crop.delete.${sceneId}.${id}` : "")

  let matchTitle = t("match_catalog")
  if (failed) matchTitle = t("retry")
  if (completed || hasMatches) matchTitle = t("reprocess")

  const showRefresh = failed || completed || hasMatches

  const onMatch = (event) => {
    event.stopPropagation()
    if ((completed || hasMatches) && !window.confirm(t("reprocess_this_matching"))) return
    void requestCropMatch(scene, id)
  }

  const onDelete = (event) => {
    event.stopPropagation()
    if (!window.confirm(t("delete_this_crop"))) return
    void deleteCrop(scene, id)
  }

  return (
    <article
      ref={cardRef}
      className={cn(
        materialCardClass({ ready: true, padded: false }),
        "cursor-pointer overflow-hidden",
        selected && "ring-2 ring-brand-500"
      )}
      onClick={() => onSelect(id)}
    >
      <div className="flex items-stretch">
        <div className="h-[7.8rem] w-[7.8rem] shrink-0 overflow-hidden bg-gray-100 sm:h-[9.1rem] sm:w-[9.1rem]">
          {url &&
            <img
              src={url}
              alt={label || t("crop")}
              className="h-full w-full object-cover"
            />
          }
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-1 px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="m-0 truncate text-sm font-medium capitalize text-gray-900">
                {label || t("furniture")}
              </p>
              {confidencePercent != null &&
                <p className="m-0 mt-0.5 text-xs text-gray-500">
                  {t("detection_percent", { percent: confidencePercent })}
                </p>
              }
            </div>
            <Tooltip label={matchTitle}>
              <span onClick={(event) => event.stopPropagation()}>
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  size="lg"
                  radius="xl"
                  aria-label={matchTitle}
                  disabled={generating || deleting}
                  loading={matching || generating}
                  onClick={onMatch}
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
            <Tooltip label={t("delete")}>
              <span onClick={(event) => event.stopPropagation()}>
                <ActionIcon
                  variant="subtle"
                  color="red"
                  size="lg"
                  radius="xl"
                  aria-label={t("delete")}
                  disabled={generating || deleting}
                  loading={deleting}
                  onClick={onDelete}
                >
                  <IconTrash size={18} stroke={1.75} />
                </ActionIcon>
              </span>
            </Tooltip>
          </div>

          {sorted.length > 0 &&
            <ul className="m-0 list-none divide-y divide-gray-100 border-t border-gray-100 p-0">
              {sorted.map((match) => (
                <MatchRow
                  key={match.productId}
                  match={match}
                  product={productsById[match.productId]}
                  sceneId={sceneId}
                  inSketchup={inSketchup}
                  glbSupported={glbSupported}
                />
              ))}
            </ul>
          }

          {sorted.length === 0 && completed &&
            <p className="m-0 px-4 pb-3 text-xs text-gray-500">{t("no_catalog_matches_found")}</p>
          }

          {sorted.length === 0 && generating &&
            <p className="m-0 px-4 pb-3 text-xs text-gray-500">{t("finding_matches")}</p>
          }
        </div>
      </div>
    </article>
  )
}
