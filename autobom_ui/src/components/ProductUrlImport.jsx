import { showModal } from "../lib/modals.js"
import { ExternalLinkIcon } from "./Icons.jsx"
import ProductUrlImportModal from "./ProductUrlImportModal.jsx"


export default function ProductUrlImport() {
  return (
    <button
      type="button"
      className="ab-btn-toolbar"
      onClick={() => showModal(ProductUrlImportModal)}
    >
      <ExternalLinkIcon />
      From URL
    </button>
  )
}
