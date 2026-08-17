import { PageHeader } from "./AppShell.jsx"
import { useTranslation } from "react-i18next"

export function SceneAnalyzerHeader() {
  const { t } = useTranslation()
  return (
    <PageHeader
      title={t("scene_analyzer")}
      description={t("scene_analyzer_description")}
    />
  )
}
