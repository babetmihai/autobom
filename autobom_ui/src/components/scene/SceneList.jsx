import React from "react"
import { Link } from "react-router-dom"
import { useSelector } from "react-redux"
import { Badge, Button, Center, Group, Loader, Paper, Text, Title } from "@mantine/core"
import { IconClock, IconRefresh } from "@tabler/icons-react"
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
import { cn } from "../../lib/index.js"

const sceneThumbSizeClass = "h-[5.2rem] w-[5.2rem]"
const sceneRowContentClass = "flex min-w-0 flex-1 flex-col justify-start gap-1 p-3"

const statusColor = {
  complete: "green",
  processing: "brand",
  failed: "red",
  pending: "gray"
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
      <Group justify="space-between" gap="xs" mb="sm">
        <Group gap="xs" className="min-w-0">
          <Title
            order={3}
            size="sm"
            id="scene-list-heading"
            className="m-0 text-gray-700"
          >
            Your scenes
          </Title>
          {showList &&
            <Badge color="gray" variant="light" size="sm">
              {scenes.length}
            </Badge>
          }
        </Group>
        {showList &&
          <Button
            variant="default"
            size="compact-sm"
            className="shrink-0"
            onClick={() => fetchScenes({ reset: true })}
            disabled={loading}
            aria-label="Refresh scenes"
            leftSection={loading ? <Loader size={14} /> : <IconRefresh size={16} stroke={1.75} />}
          >
            Refresh
          </Button>
        }
      </Group>

      {initialLoading &&
        <ul className="m-0 flex list-none flex-col gap-2 p-0" aria-hidden="true">
          {skeletonRows.map((row) => (
            <li
              key={row}
              className="flex h-[5.2rem] animate-pulse overflow-hidden rounded-lg border border-gray-200 bg-white"
            >
              <div className={cn("shrink-0 bg-gray-200", sceneThumbSizeClass)} />
              <div className={sceneRowContentClass}>
                <div className="h-3.5 w-28 rounded bg-gray-200" />
                <div className="h-3 w-40 rounded bg-gray-100" />
              </div>
            </li>
          ))}
        </ul>
      }

      {listReady && listEmpty &&
        <Paper
          withBorder
          p="xl"
          radius="md"
          className="border-dashed text-center"
        >
          <Text fw={500} size="sm">No scenes yet</Text>
          <Text size="xs" c="dimmed" mt={4}>
            Upload a room photo above to detect furniture and match catalog items.
          </Text>
        </Paper>
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
                    "flex h-[5.2rem] overflow-hidden rounded-lg border border-gray-200 bg-white",
                    "transition-[border-color,box-shadow,background-color]",
                    "hover:border-brand-500/40 hover:bg-gray-50/80 hover:shadow-sm",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/30 focus-visible:ring-offset-2"
                  )}
                >
                  <div className={cn("aspect-square shrink-0 bg-gray-100", sceneThumbSizeClass)}>
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
                      <span className="min-w-0 truncate text-sm font-medium text-gray-800">
                        {sceneName}
                      </span>
                      <Badge
                        color={statusColor[tone] || "gray"}
                        variant="light"
                        size="sm"
                        leftSection={
                          (queued && <IconClock size={12} stroke={1.75} />) ||
                          (processing && <Loader size={12} />) ||
                          undefined
                        }
                      >
                        {statusLabel}
                      </Badge>
                    </div>
                    <Text size="xs" c="dimmed" className="m-0 truncate">
                      {metaLabel}
                      {relativeDate && ` · ${relativeDate}`}
                    </Text>
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      }

      {showList && hasMore &&
        <Center mt="md">
          <Button variant="default" onClick={() => loadMoreScenes()} loading={loadingMore}>
            Load more
          </Button>
        </Center>
      }
    </section>
  )
}
