import { PageHeader } from "./AppShell.jsx"
import { isInSketchup } from "../lib/sketchup.js"
import { useTranslation } from "react-i18next"

export function AppHeader() {
  const { t } = useTranslation()
  const inSketchup = isInSketchup()
  let description = t("browse_catalog_models")
  if (inSketchup) description = t("browse_catalog_models_sketchup")

  return (
    <PageHeader
      title={t("product_catalog")}
      description={description}
    />
  )
}
