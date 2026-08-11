import React from "react"
import { Link } from "react-router-dom"
import { useSelector } from "react-redux"
import {
  fetchScenes,
  formatSceneRelativeDate,
  loadMoreScenes,
  resolveSceneName,
  sceneIsProcessing,
  sceneIsQueued,
  sceneStatusLabel,
  sceneStatusTone,
  selectScenesList,
  selectScenesListMeta
} from "../../lib/scenes.js"
import { useLoader } from "../../lib/loaders.js"
import { ClockIcon, LoadingSpinnerIcon, RefreshIcon } from "../Icons.jsx"
import { cn } from "../../lib/index.js"

const sceneThumbSizeClass = "h-[5.2rem] w-[5.2rem]"
const sceneRowContentClass = "flex min-w-0 flex-1 flex-col justify-start gap-1 p-3"

const statusBadgeClass = {
  complete: "border-green-300 bg-green-50 text-green-800",
  processing: "border-brand/30 bg-brand/10 text-brand-dark",
  failed: "border-red-300 bg-red-50 text-red-800",
  pending: "border-neutral-200 bg-neutral-50 text-neutral-600"
}

const skeletonRows = [0, 1, 2]


export default function SceneList() {
  const scenes = useSelector(() => selectScenesList())
  const { hasMore } = useSelector(() => selectScenesListMeta())
  const loading = useLoader("scenes.list")
  const loadingMore = useLoader("scenes.loadMore")
  const listReady = !loading
  const listEmpty = scenes.length === 0
  const initialLoading = loading && listEmpty
  const showList = !listEmpty

  React.useEffect(() => {
    void fetchScenes({ reset: true })
  }, [])

  return (
    <section className="mb-6" aria-labelledby="scene-list-heading">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <h2 id="scene-list-heading" className="m-0 text-sm font-semibold text-neutral-700">
            Your scenes
          </h2>
          {showList &&
            <span className="rounded-full bg-neutral-200 px-2 py-0.5 text-xs font-medium tabular-nums text-neutral-600">
              {scenes.length}
            </span>
          }
        </div>
        {showList &&
          <button
            type="button"
            className="ab-btn-toolbar shrink-0"
            onClick={() => fetchScenes({ reset: true })}
            disabled={loading}
            aria-label="Refresh scenes"
          >
            {loading &&
              <LoadingSpinnerIcon className="h-4 w-4 animate-spin" />
            }
            {!loading &&
              <RefreshIcon />
            }
            Refresh
          </button>
        }
      </div>

      {initialLoading &&
        <ul className="m-0 flex list-none flex-col gap-2 p-0" aria-hidden="true">
          {skeletonRows.map((row) => (
            <li
              key={row}
              className="flex h-[5.2rem] animate-pulse overflow-hidden rounded-lg border border-neutral-200 bg-white"
            >
              <div className={cn("shrink-0 bg-neutral-200", sceneThumbSizeClass)} />
              <div className={sceneRowContentClass}>
                <div className="h-3.5 w-28 rounded bg-neutral-200" />
                <div className="h-3 w-40 rounded bg-neutral-100" />
              </div>
            </li>
          ))}
        </ul>
      }

      {listReady && listEmpty &&
        <div className="rounded-lg border border-dashed border-neutral-300 bg-white px-4 py-8 text-center">
          <p className="m-0 text-sm font-medium text-neutral-700">No scenes yet</p>
          <p className="m-0 mt-1 text-xs text-neutral-500">
            Upload a room photo above to detect furniture and match catalog items.
          </p>
        </div>
      }

      {showList &&
        <ul className={cn("m-0 flex list-none flex-col gap-2 p-0", loading && "opacity-60")}>
          {scenes.map((scene) => {
            const queued = sceneIsQueued(scene.status)
            const processing = sceneIsProcessing(scene.status)
            const tone = sceneStatusTone(scene.status)
            const cropCount = scene.crops?.length || 0
            const relativeDate = formatSceneRelativeDate(scene.createdAt)
            const statusLabel = sceneStatusLabel(scene.status)
            const sceneName = resolveSceneName(scene)

            let metaLabel = "No items detected yet"
            if (cropCount > 0) {
              metaLabel = `${cropCount} item${cropCount === 1 ? "" : "s"} detected`
            } else if (processing) {
              metaLabel = "Analysis in progress"
            }

            return (
              <li key={scene.id}>
                <Link
                  to={`/scene-analyzer/${scene.id}`}
                  aria-label={`Open ${sceneName}, ${statusLabel}`}
                  className={cn(
                    "flex h-[5.2rem] overflow-hidden rounded-lg border border-neutral-200 bg-white",
                    "transition-[border-color,box-shadow,background-color]",
                    "hover:border-brand/40 hover:bg-neutral-50/80 hover:shadow-sm",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 focus-visible:ring-offset-2"
                  )}
                >
                  <div className={cn("aspect-square shrink-0 bg-neutral-100", sceneThumbSizeClass)}>
                    {scene.url &&
                      <img
                        src={scene.url}
                        alt=""
                        loading="lazy"
                        className="aspect-square h-full w-full object-cover"
                      />
                    }
                  </div>
                  <div className={sceneRowContentClass}>
                    <div className="flex items-start justify-between gap-3">
                      <span className="min-w-0 truncate text-sm font-medium text-neutral-800">
                        {sceneName}
                      </span>
                      <span
                        className={cn(
                          "flex shrink-0 items-center gap-1 rounded-md border px-1.5 py-0.5",
                          "text-[0.6875rem] font-medium leading-none",
                          statusBadgeClass[tone]
                        )}
                      >
                        {queued &&
                          <ClockIcon className="h-3 w-3" />
                        }
                        {processing &&
                          <LoadingSpinnerIcon className="h-3 w-3 animate-spin" />
                        }
                        {statusLabel}
                      </span>
                    </div>
                    <p className="m-0 truncate text-xs text-neutral-500">
                      {metaLabel}
                      {relativeDate && ` · ${relativeDate}`}
                    </p>
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      }

      {showList && hasMore &&
        <div className="mt-4 flex justify-center">
          <button
            type="button"
            className="ab-btn-toolbar"
            onClick={() => loadMoreScenes()}
            disabled={loadingMore}
          >
            {loadingMore && "Loading..."}
            {!loadingMore && "Load more"}
          </button>
        </div>
      }
    </section>
  )
}
