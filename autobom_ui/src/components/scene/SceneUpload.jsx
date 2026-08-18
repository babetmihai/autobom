import React from "react"
import { useHistory } from "react-router-dom"
import { Loader } from "@mantine/core"
import { IconUpload } from "@tabler/icons-react"
import { cn, materialCardClass } from "../../lib/index.js"
import { uploadScene } from "../../lib/scenes.js"
import { useLoader } from "../../lib/loaders.js"
import { useTranslation } from "react-i18next"


export default function SceneUpload() {
  const { t } = useTranslation()
  const history = useHistory()
  const uploading = useLoader("scenes.upload")
  const inputRef = React.useRef(null)
  const [dragging, setDragging] = React.useState(false)

  const handleFiles = async (files) => {
    const file = (files || [])[0]
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
          materialCardClass({
            ready: false,
            generating: uploading,
            padded: false
          }),
          "flex min-h-[9rem] cursor-pointer flex-col items-center justify-center px-4 py-6 text-center sm:min-h-[11rem]",
          dragging && "border-brand-500 bg-brand-50"
        )}
        onClick={() => {
          const input = inputRef.current
          if (input) input.click()
        }}
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
            const input = inputRef.current
            if (input) input.click()
          }
        }}
      >
        {uploading &&
          <div className="flex items-center justify-center gap-2 text-amber-700">
            <Loader size={16} color="brand" />
            <p className="m-0 text-sm">{t("uploading_scene")}</p>
          </div>
        }
        {!uploading &&
          <>
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-brand-700">
              <IconUpload size={20} stroke={1.75} />
            </div>
            <p className="m-0 max-w-md text-sm font-medium text-gray-900">
              {t("drop_room_photo")}
            </p>
            <p className="m-0 mt-1 text-xs text-gray-500">{t("jpeg_png_or_webp")}</p>
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
