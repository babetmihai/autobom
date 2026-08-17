import { Button } from "@mantine/core"
import { IconExternalLink } from "@tabler/icons-react"
import { useTranslation } from "react-i18next"
import { showModal } from "../lib/modals.js"
import ProductUrlImportModal from "./ProductUrlImportModal.jsx"


export default function ProductUrlImport() {
  const { t } = useTranslation()
  return (
    <Button
      variant="default"
      leftSection={<IconExternalLink size={16} stroke={1.75} />}
      onClick={() => showModal(ProductUrlImportModal)}
    >
      {t("from_url")}
    </Button>
  )
}
