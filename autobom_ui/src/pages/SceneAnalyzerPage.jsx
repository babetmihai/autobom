import React from "react"
import { Link, useParams } from "react-router-dom"
import { useSelector } from "react-redux"
import { ActionIcon, Anchor, Tooltip } from "@mantine/core"
import { IconChevronLeft, IconRefresh } from "@tabler/icons-react"
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
import { cn, materialCardClass, materialStatusTone } from "../lib/index.js"
import { glbNativeImport, isInSketchup, useSketchupEnvListener } from "../lib/sketchup.js"
import { useTranslation } from "react-i18next"


export default function SceneAnalyzerPage() {
  const { t } = useTranslation()
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
      const el = cropCardRefs.current[cropId]
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" })
    })
  }

  useSceneListener(sceneId)
  useImportListener()
  useTagListener()
  useSketchupEnvListener(setSketchupEnv)

  const inSketchup = isInSketchup()
  const glbSupported = !inSketchup || !sketchupEnv || glbNativeImport(sketchupEnv)
  const { crops, status } = scene || {}

  React.useEffect(() => {
    const cropList = crops || []
    if (!cropList.length) {
      setSelectedCropId(null)
      return
    }
    const stillSelected = cropList.some((crop) => crop.id === selectedCropId)
    if (!stillSelected) {
      setSelectedCropId(cropList[0].id)
    }
  }, [crops, selectedCropId])

  const queued = scene && sceneIsQueued(status)
  const processing = scene && sceneIsProcessing(status)
  const failed = scene && sceneIsFailed(status)
  const analysisComplete = scene && sceneMatchingComplete(status)
  const hasCrops = cropsWithMatches.length > 0
  const retrying = useLoader(sceneId ? `scenes.retry.${sceneId}` : "")
  const { statusClass, dotClass } = materialStatusTone({
    ready: Boolean(scene) && !processing && !failed && !queued,
    generating: Boolean(processing),
    failed: Boolean(failed)
  })

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
          {t("scenes")}
        </Anchor>
      }

      {!sceneId && <SceneList />}

      {scene &&
        <article
          className={cn(
            materialCardClass({
              ready: !processing && !failed,
              generating: processing,
              failed,
              padded: false
            }),
            "mb-4"
          )}
        >
          <div className="flex items-start gap-1 px-4 py-3">
            <div className="min-w-0 flex-1">
              <SceneNameField scene={scene} />
              <p className={cn("m-0 mt-0.5 flex items-center gap-1.5 text-xs leading-4", statusClass)}>
                <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", dotClass)} />
                <span className="truncate">{sceneStatusLabel(status)}</span>
              </p>
            </div>
            {failed &&
              <Tooltip label={t("retry")}>
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  size="lg"
                  radius="xl"
                  aria-label={t("retry")}
                  loading={retrying}
                  onClick={() => void retryScene(scene)}
                >
                  <IconRefresh size={18} stroke={1.75} />
                </ActionIcon>
              </Tooltip>
            }
          </div>
        </article>
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
          <h3 className="m-0 mb-2 px-1 text-xs font-medium uppercase tracking-wide text-gray-500">
            {t("detected_furniture", { count: cropsWithMatches.length })}
          </h3>
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
                sceneStatus={status}
                sceneId={sceneId}
                inSketchup={inSketchup}
                glbSupported={glbSupported}
              />
            ))}
          </div>
        </section>
      }

      {scene && !hasCrops && processing &&
        <p className="m-0 text-sm text-gray-500">{t("scanning_scene")}</p>
      }

      {scene && !hasCrops && analysisComplete && !failed &&
        <div className={cn(materialCardClass({ ready: false }), "py-10 text-center")}>
          <p className="m-0 text-sm font-medium text-gray-700">{t("no_furniture_detected")}</p>
          <p className="m-0 mt-1 text-xs text-gray-500">{t("try_clearer_photo")}</p>
        </div>
      }
    </AppShell>
  )
}
