import { Button } from "@mantine/core"
import { IconExternalLink } from "@tabler/icons-react"
import { showModal } from "../lib/modals.js"
import ProductUrlImportModal from "./ProductUrlImportModal.jsx"


export default function ProductUrlImport() {
  return (
    <Button
      variant="default"
      leftSection={<IconExternalLink size={16} stroke={1.75} />}
      onClick={() => showModal(ProductUrlImportModal)}
    >
      From URL
    </Button>
  )
}
