import React from "react"
import { resolveSceneName, updateSceneName } from "../../lib/scenes.js"
import { useLoader } from "../../lib/loaders.js"
import { cn } from "../../lib/index.js"


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
    <div className="mb-4">
      <label htmlFor={`scene-name-${scene.id}`} className="mb-1 block text-xs font-medium text-neutral-500">
        Scene name
      </label>
      <input
        id={`scene-name-${scene.id}`}
        type="text"
        value={draft}
        disabled={saving}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => void save()}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.currentTarget.blur()
          if (event.key === "Escape") {
            setDraft(displayName)
            event.currentTarget.blur()
          }
        }}
        className={cn(
          "w-full max-w-md rounded-lg border border-neutral-200 bg-white px-3 py-2 font-[inherit]",
          "text-base font-medium text-neutral-800 outline-none transition-[border-color,box-shadow]",
          "focus:border-brand focus:ring-[3px] focus:ring-brand/15",
          "disabled:cursor-not-allowed disabled:opacity-60"
        )}
      />
    </div>
  )
}
