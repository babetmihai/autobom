import React from "react"
import { TextInput } from "@mantine/core"
import { resolveSceneName, updateSceneName } from "../../lib/scenes.js"
import { useLoader } from "../../lib/loaders.js"


export default function SceneNameField({ scene }) {
  const displayName = resolveSceneName(scene)
  const [draft, setDraft] = React.useState(displayName)
  const saving = useLoader(`scenes.rename.${scene.id}`)

  React.useEffect(() => {
    setDraft(resolveSceneName(scene))
  }, [scene?.id, scene?.name, scene?.createdAt])

  const save = async () => {
    const trimmed = draft.trim()
    if (!trimmed) {
      setDraft(displayName)
      return
    }

    const stored = scene?.name?.trim()
    if (stored) {
      if (stored === trimmed) return
    } else if (trimmed === displayName) {
      return
    }

    await updateSceneName(scene.id, trimmed)
  }

  return (
    <TextInput
      id={`scene-name-${scene.id}`}
      label="Scene name"
      value={draft}
      disabled={saving}
      mb="md"
      maw={28 * 16}
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
