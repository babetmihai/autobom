import React from "react"
import { Button, Group, Text, TextInput } from "@mantine/core"
import { useTranslation } from "react-i18next"
import { actions } from "../lib/store/index.js"
import { hideModal } from "../lib/modals.js"
import { importProductFromUrl } from "../lib/products.js"
import { useLoader } from "../lib/loaders.js"
import AppModal from "./AppModal.jsx"

const appActions = actions.create("app")

export default function ProductUrlImportModal({ onClose = hideModal }) {
  const { t } = useTranslation()
  const importing = useLoader("products.importFromUrl")
  const [url, setUrl] = React.useState("")

  const onSubmit = async (event) => {
    event.preventDefault()
    const id = await importProductFromUrl(url)
    if (!id) return
    appActions.set("hasGlb", false)
    appActions.set("hasBundle", false)
    onClose()
  }

  return (
    <AppModal
      name={t("import_from_url")}
      onClose={onClose}
      footer={
        <Group gap="xs" justify="flex-end">
          <Button variant="default" disabled={importing} onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button
            type="submit"
            form="product-url-import-form"
            color="brand"
            disabled={!url.trim()}
            loading={importing}
          >
            {(importing && t("adding")) || t("add_product")}
          </Button>
        </Group>
      }
    >
      <form
        id="product-url-import-form"
        className="flex flex-col gap-3"
        onSubmit={onSubmit}
      >
        <TextInput
          label={t("product_page_url")}
          type="url"
          required
          autoFocus
          disabled={importing}
          placeholder="https://store.example/products/..."
          value={url}
          onChange={(event) => setUrl(event.currentTarget.value)}
        />
        <Text size="xs" c="dimmed">
          {t("import_from_url_hint")}
        </Text>
      </form>
    </AppModal>
  )
}
