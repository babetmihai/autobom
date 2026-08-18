import _ from "lodash"
import { cn, materialCardClass } from "../../lib/index.js"
import {
  sceneMatchingComplete,
  sceneMatchingProcessing
} from "../../lib/scenes.js"
import MatchRow from "./MatchRow.jsx"
import { useTranslation } from "react-i18next"


export default function CropCard({
  crop,
  matches,
  productsById,
  selected,
  onSelect,
  cardRef,
  sceneStatus,
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
  const matchingComplete = sceneMatchingComplete(sceneStatus)
  const matchingProcessing = sceneMatchingProcessing(sceneStatus)

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
          <div className="px-4 py-3">
            <p className="m-0 truncate text-sm font-medium capitalize text-gray-900">
              {label || t("furniture")}
            </p>
            {confidencePercent != null &&
              <p className="m-0 mt-0.5 text-xs text-gray-500">
                {t("detection_percent", { percent: confidencePercent })}
              </p>
            }
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

          {sorted.length === 0 && matchingComplete &&
            <p className="m-0 px-4 pb-3 text-xs text-gray-500">{t("no_catalog_matches_found")}</p>
          }

          {sorted.length === 0 && matchingProcessing &&
            <p className="m-0 px-4 pb-3 text-xs text-gray-500">{t("finding_matches")}</p>
          }
        </div>
      </div>
    </article>
  )
}
