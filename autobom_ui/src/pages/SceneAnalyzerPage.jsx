import React from "react"
import { Link, useParams } from "react-router-dom"
import { useSelector } from "react-redux"
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
import { cn } from "../lib/index.js"
import { ChevronLeftIcon, ClockIcon, LoadingSpinnerIcon, RefreshIcon } from "../components/Icons.jsx"
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
        <Link to="/scene-analyzer" className="ab-back-link mb-4">
          <ChevronLeftIcon />
          Scenes
        </Link>
      }

      {!sceneId && <SceneList />}

      {scene && <SceneNameField scene={scene} />}

      {scene && (
        <div className="mb-4 flex items-center gap-2 text-sm text-neutral-600">
          {queued &&
            <ClockIcon className="h-4 w-4 text-neutral-500" />
          }
          {processing &&
            <LoadingSpinnerIcon className="h-4 w-4 animate-spin text-brand" />
          }
          <span className={cn(failed && "text-red-700")}>
            {sceneStatusLabel(scene.status)}
          </span>
          {failed &&
            <button
              type="button"
              className="ab-btn-toolbar text-neutral-700"
              disabled={retrying}
              onClick={() => void retryScene(scene)}
            >
              {retrying &&
                <LoadingSpinnerIcon className="h-4 w-4 animate-spin" />
              }
              {!retrying &&
                <RefreshIcon />
              }
              Retry
            </button>
          }
        </div>
      )}

      {scene && (
        <SceneViewer
          scene={scene}
          selectedCropId={selectedCropId}
          onSelectCrop={selectCropFromScene}
        />
      )}

      {hasCrops && (
        <section>
          <h2 className="mb-3 mt-0 text-sm font-semibold text-neutral-700">
            Detected furniture ({cropsWithMatches.length})
          </h2>
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
      )}

      {scene && !hasCrops && processing &&
        <p className="m-0 text-sm text-neutral-500">
          Scanning the scene for furniture...
        </p>
      }

      {scene && !hasCrops && analysisComplete && !failed &&
        <div className="rounded-lg border border-dashed border-neutral-300 bg-white px-4 py-8 text-center">
          <p className="m-0 text-sm font-medium text-neutral-700">No furniture detected</p>
          <p className="m-0 mt-1 text-xs text-neutral-500">
            Try a clearer room photo with visible furniture.
          </p>
        </div>
      }
    </AppShell>
  )
}
