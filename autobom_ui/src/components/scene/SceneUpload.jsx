import React from "react"
import { useHistory } from "react-router-dom"
import { cn } from "../../lib/index.js"
import { uploadScene } from "../../lib/scenes.js"
import { useLoader } from "../../lib/loaders.js"
import { LoadingSpinnerIcon, UploadIcon } from "../Icons.jsx"


export default function SceneUpload() {
  const history = useHistory()
  const uploading = useLoader("scenes.upload")
  const inputRef = React.useRef(null)
  const [dragging, setDragging] = React.useState(false)

  const handleFiles = async (files) => {
    const file = files?.[0]
    if (!file || !file.type.startsWith("image/")) return
    const id = await uploadScene(file)
    if (id) history.push(`/scene-analyzer/${id}`)
  }

  const onDrop = (event) => {
    event.preventDefault()
    setDragging(false)
    handleFiles(event.dataTransfer.files)
  }

  return (
    <section className="mb-6 w-full">
      <div
        className={cn(
          "flex w-full min-h-[9rem] cursor-pointer flex-col items-center justify-center",
          "rounded-lg border-2 border-dashed bg-white text-center transition-colors",
          "px-4 py-6 sm:min-h-[11rem] sm:px-6 sm:py-8",
          dragging && "border-brand bg-brand/5",
          !dragging && "border-neutral-300 hover:border-brand/50"
        )}
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            inputRef.current?.click()
          }
        }}
      >
        {uploading &&
          <div className="flex max-w-full flex-wrap items-center justify-center gap-2 px-2 text-neutral-600">
            <LoadingSpinnerIcon className="h-5 w-5 shrink-0 animate-spin text-brand" />
            <span className="text-sm sm:text-base">Uploading scene...</span>
          </div>
        }
        {!uploading &&
          <>
            <UploadIcon className="mb-2 h-8 w-8 shrink-0 text-brand sm:h-10 sm:w-10" />
            <p className="m-0 max-w-xs px-2 text-sm font-medium text-neutral-700 sm:max-w-md sm:text-base">
              Drop a room photo here or tap to browse
            </p>
            <p className="m-0 mt-1 text-xs text-neutral-500 sm:text-sm">JPEG, PNG, or WebP</p>
          </>
        }
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(event) => {
          handleFiles(event.target.files)
          event.target.value = ""
        }}
      />
    </section>
  )
}
