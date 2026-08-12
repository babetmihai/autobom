import React from "react"
import { cn } from "../../lib/index.js"


export default function SceneViewer({ scene, selectedCropId, onSelectCrop }) {
  const imgRef = React.useRef(null)
  const [size, setSize] = React.useState({ w: 0, h: 0 })

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
  }, [scene?.url, scene?.crops?.length])

  if (!scene?.url) return null

  const scaleX = size.w / (scene.imageWidth || 1)
  const scaleY = size.h / (scene.imageHeight || 1)

  return (
    <section className="mb-6">
      <h2 className="mb-3 mt-0 text-sm font-semibold text-gray-700">Scene overview</h2>
      <div className="flex w-full max-w-full justify-center overflow-hidden rounded-lg border border-gray-200 bg-white">
        <div className="relative max-w-full">
          <img
            ref={imgRef}
            src={scene.url}
            alt="Uploaded scene"
            className="block h-auto max-h-[40vh] w-full object-contain sm:max-h-[32rem] sm:w-auto sm:max-w-full"
          />
          {scene.crops?.map((crop) => {
            const [x, y, w, h] = crop.bbox || []
            if (x == null) return null
            const active = crop.id === selectedCropId
            return (
              <button
                key={crop.id}
                type="button"
                onClick={() => onSelectCrop?.(crop.id)}
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
                aria-label={crop.label || "Detected item"}
              />
            )
          })}
        </div>
      </div>
    </section>
  )
}
