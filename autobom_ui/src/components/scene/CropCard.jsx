import _ from "lodash"
import { cn } from "../../lib/index.js"
import {
  sceneMatchingComplete,
  sceneMatchingProcessing
} from "../../lib/scenes.js"
import MatchRow from "./MatchRow.jsx"


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
  const sorted = _.orderBy(matches, "score", "desc")
    .filter((match) => (match.score || 0) >= 0.51)
    .slice(0, 5)
  const confidencePercent = crop.confidence != null
    ? Math.round(crop.confidence * 100)
    : null

  return (
    <article
      ref={cardRef}
      className={cn(
        "cursor-pointer overflow-hidden rounded-lg border border-neutral-200 bg-white transition-shadow",
        selected && "ring-2 ring-brand"
      )}
      onClick={() => onSelect?.(crop.id)}
    >
      <div className="flex items-stretch">
        {crop.url &&
          <img
            src={crop.url}
            alt={crop.label || "Crop"}
            className="aspect-square h-[7.8rem] w-[7.8rem] shrink-0 object-cover sm:h-[9.1rem] sm:w-[9.1rem]"
          />
        }
        {!crop.url &&
          <div className="aspect-square h-[7.8rem] w-[7.8rem] shrink-0 bg-neutral-100 sm:h-[9.1rem] sm:w-[9.1rem]" />
        }
        <div className="min-w-0 flex-1 p-3">
          <div className="mb-3">
            <p className="m-0 text-sm font-medium capitalize text-neutral-800">
              {crop.label || "Furniture"}
            </p>
            {confidencePercent != null && (
              <p className="m-0 text-xs text-neutral-500">
                Detection {confidencePercent}%
              </p>
            )}
          </div>

          {sorted.length > 0 && (
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
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
          )}

          {sorted.length === 0 && sceneMatchingComplete(sceneStatus) && (
            <p className="m-0 text-xs text-neutral-500">No catalog matches found</p>
          )}

          {sorted.length === 0 && sceneMatchingProcessing(sceneStatus) && (
            <p className="m-0 text-xs text-neutral-500">Finding matches...</p>
          )}
        </div>
      </div>
    </article>
  )
}
