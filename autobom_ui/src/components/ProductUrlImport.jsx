import { ActionIcon, Tooltip } from "@mantine/core"
import { IconLink } from "@tabler/icons-react"
import { useTranslation } from "react-i18next"
import { showModal } from "../lib/modals.js"
import ProductUrlImportModal from "./ProductUrlImportModal.jsx"

export default function ProductUrlImport() {
  const { t } = useTranslation()
  return (
    <Tooltip label={t("import_product")}>
      <ActionIcon
        variant="filled"
        color="dark"
        size="lg"
        radius="xl"
        aria-label={t("import_product")}
        onClick={() => showModal(ProductUrlImportModal)}
      >
        <IconLink size={18} stroke={1.75} />
      </ActionIcon>
    </Tooltip>
  )
}
