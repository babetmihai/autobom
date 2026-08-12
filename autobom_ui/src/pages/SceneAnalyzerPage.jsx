import React from "react"
import { Link, useParams } from "react-router-dom"
import { useSelector } from "react-redux"
import { Anchor, Button, Group, Loader, Paper, Text, Title } from "@mantine/core"
import { IconChevronLeft, IconClock, IconRefresh } from "@tabler/icons-react"
import { SceneAnalyzerHeader } from "../components/SceneAnalyzerHeader"
import { AppShell } from "../components/AppShell.jsx"
import SceneUpload from "../components/scene/SceneUpload.jsx"
import SceneList from "../components/scene/SceneList.jsx"
import SceneNameField from "../components/scene/SceneNameField.jsx"
import SceneViewer from "../components/scene/SceneViewer.jsx"
import CropCard from "../components/scene/CropCard.jsx"
import {
  retryScene,
  selectActiveScene,
  selectActiveSceneId,
  selectCropsWithMatches,
  selectSceneMatchProductsById,
  sceneIsFailed,
  sceneIsProcessing,
  sceneIsQueued,
  sceneMatchingComplete,
  sceneStatusLabel,
  setActiveSceneId,
  useSceneListener
} from "../lib/scenes.js"
import { useImportListener } from "../lib/products.js"
import { useTagListener } from "../lib/tags.js"
import { useLoader } from "../lib/loaders.js"
import { glbNativeImport, isInSketchup, useSketchupEnvListener } from "../lib/sketchup.js"


export default function SceneAnalyzerPage() {
  const { sceneId: routeSceneId } = useParams()

  React.useEffect(() => {
    setActiveSceneId(routeSceneId)
  }, [routeSceneId])

  const sceneId = useSelector(() => selectActiveSceneId())
  const scene = useSelector(() => selectActiveScene())
  const cropsWithMatches = useSelector(() => selectCropsWithMatches())
  const productsById = useSelector(() => selectSceneMatchProductsById())
  const [selectedCropId, setSelectedCropId] = React.useState(null)
  const [sketchupEnv, setSketchupEnv] = React.useState(null)
  const cropCardRefs = React.useRef({})

  const selectCropFromScene = (cropId) => {
    setSelectedCropId(cropId)
    requestAnimationFrame(() => {
      cropCardRefs.current[cropId]?.scrollIntoView({ behavior: "smooth", block: "center" })
    })
  }

  useSceneListener(sceneId)
  useImportListener()
  useTagListener()
  useSketchupEnvListener(setSketchupEnv)

  const inSketchup = isInSketchup()
  const glbSupported = !inSketchup || !sketchupEnv || glbNativeImport(sketchupEnv)

  React.useEffect(() => {
    if (!scene?.crops?.length) {
      setSelectedCropId(null)
      return
    }
    const stillSelected = scene.crops.some((crop) => crop.id === selectedCropId)
    if (!stillSelected) {
      setSelectedCropId(scene.crops[0].id)
    }
  }, [scene?.crops, selectedCropId])

  const queued = scene && sceneIsQueued(scene.status)
  const processing = scene && sceneIsProcessing(scene.status)
  const failed = scene && sceneIsFailed(scene.status)
  const analysisComplete = scene && sceneMatchingComplete(scene.status)
  const hasCrops = cropsWithMatches.length > 0
  const retrying = useLoader(sceneId ? `scenes.retry.${sceneId}` : "")

  return (
    <AppShell header={<SceneAnalyzerHeader />}>
      <SceneUpload />

      {routeSceneId &&
        <Anchor
          component={Link}
          to="/scene-analyzer"
          size="sm"
          mb="md"
          className="inline-flex items-center gap-1"
        >
          <IconChevronLeft size={16} stroke={1.75} />
          Scenes
        </Anchor>
      }

      {!sceneId && <SceneList />}

      {scene && <SceneNameField scene={scene} />}

      {scene &&
        <Group gap="xs" mb="md">
          {queued &&
            <IconClock size={16} stroke={1.75} className="text-gray-500" />
          }
          {processing &&
            <Loader size={16} color="brand" />
          }
          <Text size="sm" c={failed ? "red.7" : "dimmed"}>
            {sceneStatusLabel(scene.status)}
          </Text>
          {failed &&
            <Button
              variant="default"
              size="compact-sm"
              loading={retrying}
              leftSection={!retrying && <IconRefresh size={16} stroke={1.75} />}
              onClick={() => void retryScene(scene)}
            >
              Retry
            </Button>
          }
        </Group>
      }

      {scene &&
        <SceneViewer
          scene={scene}
          selectedCropId={selectedCropId}
          onSelectCrop={selectCropFromScene}
        />
      }

      {hasCrops &&
        <section>
          <Title
            order={3}
            size="sm"
            mb="sm"
            className="text-gray-700"
          >
            Detected furniture ({cropsWithMatches.length})
          </Title>
          <div className="flex flex-col gap-4">
            {cropsWithMatches.map(({ crop, matches }) => (
              <CropCard
                key={crop.id}
                cardRef={(el) => {
                  if (el) cropCardRefs.current[crop.id] = el
                  else delete cropCardRefs.current[crop.id]
                }}
                crop={crop}
                matches={matches}
                productsById={productsById}
                selected={crop.id === selectedCropId}
                onSelect={setSelectedCropId}
                sceneStatus={scene?.status}
                sceneId={sceneId}
                inSketchup={inSketchup}
                glbSupported={glbSupported}
              />
            ))}
          </div>
        </section>
      }

      {scene && !hasCrops && processing &&
        <Text size="sm" c="dimmed">
          Scanning the scene for furniture...
        </Text>
      }

      {scene && !hasCrops && analysisComplete && !failed &&
        <Paper
          withBorder
          p="xl"
          radius="md"
          className="border-dashed text-center"
        >
          <Text fw={500} size="sm">No furniture detected</Text>
          <Text size="xs" c="dimmed" mt={4}>
            Try a clearer room photo with visible furniture.
          </Text>
        </Paper>
      }
    </AppShell>
  )
}
