import React from "react"
import { resolveSceneName, updateSceneName } from "../../lib/scenes.js"
import { useLoader } from "../../lib/loaders.js"
import { useTranslation } from "react-i18next"


export default function SceneNameField({ scene }) {
  const { t } = useTranslation()
  const { id, name, createdAt } = scene || {}
  const displayName = resolveSceneName(scene)
  const [draft, setDraft] = React.useState(displayName)
  const saving = useLoader(`scenes.rename.${id}`)

  React.useEffect(() => {
    setDraft(resolveSceneName(scene))
  }, [id, name, createdAt])

  const save = async () => {
    const trimmed = draft.trim()
    if (!trimmed) {
      setDraft(displayName)
      return
    }

    const stored = (name || "").trim()
    if (stored) {
      if (stored === trimmed) return
    } else if (trimmed === displayName) {
      return
    }

    await updateSceneName(id, trimmed)
  }

  return (
    <input
      id={`scene-name-${id}`}
      aria-label={t("scene_name")}
      value={draft}
      disabled={saving}
      className="m-0 w-full bg-transparent text-sm font-medium text-gray-900 outline-none"
      onChange={(event) => setDraft(event.currentTarget.value)}
      onBlur={() => void save()}
      onKeyDown={(event) => {
        if (event.key === "Enter") event.currentTarget.blur()
        if (event.key === "Escape") {
          setDraft(displayName)
          event.currentTarget.blur()
        }
      }}
    />
  )
}
