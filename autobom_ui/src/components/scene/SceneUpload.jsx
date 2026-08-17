import React from "react"
import { useHistory } from "react-router-dom"
import { Loader, Text } from "@mantine/core"
import { IconUpload } from "@tabler/icons-react"
import { cn } from "../../lib/index.js"
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
          dragging && "border-brand-500 bg-brand-50",
          !dragging && "border-gray-300 hover:border-brand-500/50"
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
          <div className="flex max-w-full flex-wrap items-center justify-center gap-2 px-2 text-gray-600">
            <Loader size="sm" color="brand" />
            <Text size="sm">{t("uploading_scene")}</Text>
          </div>
        }
        {!uploading &&
          <>
            <IconUpload size={40} stroke={1.5} className="mb-2 text-brand-500" />
            <Text fw={500} size="sm" className="max-w-xs px-2 sm:max-w-md sm:text-base">
              {t("drop_room_photo")}
            </Text>
            <Text size="xs" c="dimmed" mt={4}>{t("jpeg_png_or_webp")}</Text>
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
