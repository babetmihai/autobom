import React from "react"
import { Button, Group, Text, TextInput } from "@mantine/core"
import { actions } from "../lib/store/index.js"
import { hideModal } from "../lib/modals.js"
import { importProductFromUrl } from "../lib/products.js"
import { useLoader } from "../lib/loaders.js"
import AppModal from "./AppModal.jsx"

const appActions = actions.create("app")

export default function ProductUrlImportModal({ onClose = hideModal }) {
  const importing = useLoader("products.importFromUrl")
  const [url, setUrl] = React.useState("")

  const onSubmit = async (event) => {
    event.preventDefault()
    const id = await importProductFromUrl(url)
    if (!id) return
    appActions.set("hasGlb", false)
    onClose()
  }

  return (
    <AppModal
      name="Import from URL"
      onClose={onClose}
      footer={
        <Group gap="xs" justify="flex-end">
          <Button variant="default" disabled={importing} onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="product-url-import-form"
            color="brand"
            disabled={!url.trim()}
            loading={importing}
          >
            {importing ? "Adding..." : "Add product"}
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
          label="Product page URL"
          type="url"
          required
          autoFocus
          disabled={importing}
          placeholder="https://store.example/products/..."
          value={url}
          onChange={(event) => setUrl(event.currentTarget.value)}
        />
        <Text size="xs" c="dimmed">
          Adds a product record and scrapes the page in the background.
        </Text>
      </form>
    </AppModal>
  )
}
