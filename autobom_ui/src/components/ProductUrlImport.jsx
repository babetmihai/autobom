import { ActionIcon, Tooltip } from "@mantine/core"
import { IconExternalLink } from "@tabler/icons-react"
import { useTranslation } from "react-i18next"
import { showModal } from "../lib/modals.js"
import ProductUrlImportModal from "./ProductUrlImportModal.jsx"

export default function ProductUrlImport() {
  const { t } = useTranslation()
  return (
    <Tooltip label={t("from_url")}>
      <ActionIcon
        variant="subtle"
        color="gray"
        size="lg"
        radius="xl"
        aria-label={t("from_url")}
        onClick={() => showModal(ProductUrlImportModal)}
      >
        <IconExternalLink size={18} stroke={1.75} />
      </ActionIcon>
    </Tooltip>
  )
}
