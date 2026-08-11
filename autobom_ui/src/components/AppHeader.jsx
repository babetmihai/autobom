import { PageHeader } from "./PageHeader.jsx"
import { isInSketchup } from "../lib/sketchup.js"

export function AppHeader() {
  const inSketchup = isInSketchup()
  const description = (inSketchup && "Browse catalog models — build a list and export a bill of materials")
    || "Browse catalog models"

  return (
    <PageHeader
      title="Autobom"
      description={description}
    />
  )
}
