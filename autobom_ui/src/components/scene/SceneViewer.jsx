import React from "react"
import { cn, materialCardClass } from "../../lib/index.js"
import { useTranslation } from "react-i18next"


export default function SceneViewer({ scene, selectedCropId, onSelectCrop }) {
  const { t } = useTranslation()
  const imgRef = React.useRef(null)
  const [size, setSize] = React.useState({ w: 0, h: 0 })
  const { url, crops, imageWidth, imageHeight } = scene || {}

  React.useEffect(() => {
    const img = imgRef.current
    if (!img) return

    const update = () => setSize({ w: img.clientWidth, h: img.clientHeight })
    update()
    img.addEventListener("load", update)
    window.addEventListener("resize", update)
    return () => {
      img.removeEventListener("load", update)
      window.removeEventListener("resize", update)
    }
  }, [url, (crops || []).length])

  if (!url) return null

  const scaleX = size.w / (imageWidth || 1)
  const scaleY = size.h / (imageHeight || 1)

  return (
    <section className="mb-6">
      <h3 className="m-0 mb-2 px-1 text-xs font-medium uppercase tracking-wide text-gray-500">
        {t("scene_overview")}
      </h3>
      <div className={cn(materialCardClass({ ready: true, padded: false }), "flex justify-center overflow-hidden")}>
        <div className="relative max-w-full">
          <img
            ref={imgRef}
            src={url}
            alt={t("uploaded_scene")}
            className="block h-auto max-h-[40vh] w-full object-contain sm:max-h-[32rem] sm:w-auto sm:max-w-full"
          />
          {(crops || []).map((crop) => {
            const { id, bbox, label } = crop || {}
            const [x, y, w, h] = bbox || []
            if (x == null) return null
            const active = id === selectedCropId
            return (
              <button
                key={id}
                type="button"
                onClick={() => onSelectCrop(id)}
                className={cn(
                  "absolute border-2 transition-colors",
                  active && "border-brand-500 bg-brand-500/15",
                  !active && "border-white/90 bg-white/10 hover:border-brand-500/70"
                )}
                style={{
                  left: x * scaleX,
                  top: y * scaleY,
                  width: w * scaleX,
                  height: h * scaleY
                }}
                aria-label={label || t("detected_item")}
              />
            )
          })}
        </div>
      </div>
    </section>
  )
}
