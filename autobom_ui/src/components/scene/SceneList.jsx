import React from "react"
import { Link } from "react-router-dom"
import { useSelector } from "react-redux"
import { ActionIcon, Button, Center, Tooltip } from "@mantine/core"
import { IconPencil, IconRefresh, IconTrash } from "@tabler/icons-react"
import {
  deleteScene,
  fetchScenes,
  formatSceneRelativeDate,
  loadMoreScenes,
  resolveSceneName,
  sceneIsProcessing,
  sceneStatusLabel,
  sceneStatusTone,
  selectScenesList,
  selectScenesListMeta
} from "../../lib/scenes.js"
import { useLoader, selectLoaders } from "../../lib/loaders.js"
import { showBanner } from "../../lib/banner/index.js"
import { cn, materialCardClass, materialStatusTone } from "../../lib/index.js"
import ProductGroup from "../ProductGroup.jsx"
import { showSceneModal } from "../SceneModal.jsx"
import { useTranslation } from "react-i18next"

const skeletonRows = [0, 1, 2]

export default function SceneList() {
  const { t } = useTranslation()
  const scenes = useSelector(() => selectScenesList())
  const { hasMore } = useSelector(() => selectScenesListMeta())
  const deleteLoaders = useSelector(() => selectLoaders("scenes.delete"))
  const loading = useLoader("scenes.list")
  const loadingMore = useLoader("scenes.loadMore")
  const listReady = !loading
  const listEmpty = scenes.length === 0
  const initialLoading = loading && listEmpty
  const showList = !listEmpty

  const onDelete = (id) => {
    if (!window.confirm(t("delete_this_scene"))) return
    void deleteScene(id).catch((error) => {
      console.error(error)
      showBanner("error", error.message || t("could_not_delete_scene"))
    })
  }

  React.useEffect(() => {
    void fetchScenes({ reset: true })
  }, [])

  return (
    <section className="mb-6">
      {initialLoading &&
        <ProductGroup title={t("your_scenes")}>
          {skeletonRows.map((row) => (
            <div key={row} className="flex items-center gap-3 px-4 py-3" aria-hidden="true">
              <div className="h-16 w-16 shrink-0 animate-pulse rounded-lg bg-gray-200" />
              <div className="min-w-0 flex-1">
                <div className="h-4 w-28 animate-pulse rounded bg-gray-200" />
                <div className="mt-2 h-3 w-40 animate-pulse rounded bg-gray-100" />
              </div>
            </div>
          ))}
        </ProductGroup>
      }

      {listReady && listEmpty &&
        <div className={cn(materialCardClass({ ready: false }), "py-10 text-center")}>
          <p className="m-0 text-sm font-medium text-gray-700">{t("no_scenes_yet")}</p>
          <p className="m-0 mt-1 text-xs text-gray-500">{t("no_scenes_hint")}</p>
        </div>
      }

      {showList &&
        <div className={cn(loading && "opacity-60")}>
          <ProductGroup
            title={t("your_scenes")}
            actions={
              <Tooltip label={t("refresh_scenes")}>
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  size="md"
                  radius="xl"
                  aria-label={t("refresh_scenes")}
                  disabled={loading}
                  onClick={() => fetchScenes({ reset: true })}
                >
                  <IconRefresh size={16} stroke={1.75} />
                </ActionIcon>
              </Tooltip>
            }
          >
            {scenes.map((scene) => {
              const { id, url, status, createdAt, crops } = scene || {}
              const processing = sceneIsProcessing(status)
              const tone = sceneStatusTone(status)
              const cropCount = (crops || []).length
              const relativeDate = formatSceneRelativeDate(createdAt)
              const statusLabel = sceneStatusLabel(status)
              const sceneName = resolveSceneName(scene)
              const { statusClass, dotClass } = materialStatusTone({
                ready: tone === "complete",
                generating: processing,
                failed: tone === "failed"
              })

              let metaLabel = t("no_items_detected_yet")
              if (cropCount > 0) {
                metaLabel = t("items_detected", { count: cropCount })
              }
              if (cropCount === 0 && processing) {
                metaLabel = t("analysis_in_progress")
              }

              return (
                <div key={id} className="flex items-center hover:bg-gray-50">
                  <Link
                    to={`/scene-analyzer/${id}`}
                    aria-label={t("open_scene", { name: sceneName, status: statusLabel })}
                    className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3"
                  >
                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                      {url &&
                        <img
                          src={url}
                          alt=""
                          loading="lazy"
                          className="h-full w-full object-cover"
                        />
                      }
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="m-0 truncate text-sm font-medium text-gray-900">
                        {sceneName}
                      </p>
                      <p className={cn("m-0 mt-0.5 flex items-center gap-1.5 text-xs leading-4", statusClass)}>
                        <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", dotClass)} />
                        <span className="truncate">{statusLabel}</span>
                      </p>
                      <p className="m-0 mt-1 truncate text-xs text-gray-500">
                        {metaLabel}
                        {relativeDate && ` · ${relativeDate}`}
                      </p>
                    </div>
                  </Link>
                  <div className="flex shrink-0 items-center pr-2">
                    <Tooltip label={t("edit")}>
                      <ActionIcon
                        variant="subtle"
                        color="gray"
                        size="lg"
                        radius="xl"
                        aria-label={t("edit")}
                        disabled={Boolean(deleteLoaders[id])}
                        onClick={() => showSceneModal({ sceneId: id })}
                      >
                        <IconPencil size={18} stroke={1.75} />
                      </ActionIcon>
                    </Tooltip>
                    <Tooltip label={t("delete")}>
                      <ActionIcon
                        variant="subtle"
                        color="red"
                        size="lg"
                        radius="xl"
                        aria-label={t("delete")}
                        loading={Boolean(deleteLoaders[id])}
                        onClick={() => onDelete(id)}
                      >
                        <IconTrash size={18} stroke={1.75} />
                      </ActionIcon>
                    </Tooltip>
                  </div>
                </div>
              )
            })}
          </ProductGroup>
        </div>
      }

      {showList && hasMore &&
        <Center mt="md">
          <Button variant="default" radius="xl" onClick={() => loadMoreScenes()} loading={loadingMore}>
            {t("load_more")}
          </Button>
        </Center>
      }
    </section>
  )
}
