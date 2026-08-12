import React from "react"
import _ from "lodash"
import { useFormik } from "formik"
import { useSelector } from "react-redux"
import { useHistory, useLocation } from "react-router-dom"
import {
  Button,
  Group,
  Select,
  SimpleGrid,
  Stack,
  Textarea,
  TextInput
} from "@mantine/core"
import { hideModal, showModal } from "../lib/modals.js"
import { showBanner } from "../lib/banner/index.js"
import {
  CATEGORIES,
  createProduct,
  deleteProduct,
  productToFormValues,
  selectProduct,
  updateProduct
} from "../lib/products.js"
import AppModal from "./AppModal.jsx"


function ProductModal({
  productId,
  onSubmit = _.noop,
  onClose = hideModal
}) {
  const history = useHistory()
  const location = useLocation()
  const product = useSelector(() => selectProduct(productId))
  const isEdit = Boolean(productId)
  const [isDeleting, setIsDeleting] = React.useState(false)

  const formik = useFormik({
    enableReinitialize: true,
    initialValues: productToFormValues(product),
    validate: (values) => {
      const errors = {}
      if (!(values.name || "").trim()) errors.name = "Name is required"
      if (values.imageUrl && !/^https?:\/\//i.test(values.imageUrl.trim())) {
        errors.imageUrl = "Enter a valid image URL"
      }
      if (values.productUrl && !/^https?:\/\//i.test(values.productUrl.trim())) {
        errors.productUrl = "Enter a valid product URL"
      }
      return errors
    },
    onSubmit: async (values, helpers) => {
      try {
        helpers.setSubmitting(true)
        let item
        if (isEdit) {
          item = await updateProduct(productId, values)
        } else {
          item = await createProduct(values)
        }
        await onSubmit(item)
        hideModal()
      } catch (error) {
        showBanner("error", error.message || "Could not save product")
        helpers.setSubmitting(false)
      }
    }
  })

  const { values, errors, touched, isSubmitting } = formik
  const busy = isSubmitting || isDeleting
  const name = isEdit ? "Edit product" : "New product"

  const onDelete = async () => {
    if (!window.confirm("Delete this product?")) return
    try {
      setIsDeleting(true)
      await deleteProduct(productId)
      hideModal()
      if (location.pathname === `/product/${productId}`) history.push("/")
    } catch (error) {
      showBanner("error", error.message || "Could not delete product")
      setIsDeleting(false)
    }
  }

  const categoryData = [
    { value: "", label: "No category" },
    ...Object.entries(CATEGORIES).map(([id, label]) => ({ value: id, label }))
  ]

  return (
    <AppModal
      name={name}
      onClose={onClose}
      className="max-w-[32rem]"
      footer={
        <Group justify="flex-end" gap="xs">
          {isEdit &&
            <Button
              variant="subtle"
              color="red"
              className="mr-auto"
              disabled={busy}
              loading={isDeleting}
              onClick={onDelete}
            >
              Delete
            </Button>
          }
          <Button variant="default" disabled={busy} onClick={onClose}>
            Cancel
          </Button>
          <Button
            color="brand"
            disabled={busy}
            loading={isSubmitting}
            onClick={formik.handleSubmit}
          >
            Save
          </Button>
        </Group>
      }
    >
      <form onSubmit={formik.handleSubmit}>
        <Stack gap="sm">
          <TextInput
            label="Name"
            name="name"
            autoFocus
            disabled={busy}
            value={values.name}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={touched.name && errors.name}
          />
          <TextInput
            label="Title"
            name="title"
            disabled={busy}
            value={values.title}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            placeholder="Optional display title"
          />
          <Textarea
            label="Description"
            name="description"
            rows={3}
            disabled={busy}
            value={values.description}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            autosize
            minRows={3}
          />
          <SimpleGrid cols={2} spacing="sm">
            <TextInput
              label="SKU"
              name="sku"
              disabled={busy}
              value={values.sku}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
            />
            <TextInput
              label="Price"
              name="price"
              inputMode="decimal"
              disabled={busy}
              value={values.price}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
            />
          </SimpleGrid>
          <TextInput
            label="Store name"
            name="storeName"
            disabled={busy}
            value={values.storeName}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
          />
          <Select
            label="Category"
            name="categoryId"
            disabled={busy}
            data={categoryData}
            value={values.categoryId || ""}
            onChange={(value) => formik.setFieldValue("categoryId", value || "")}
            onBlur={() => formik.setFieldTouched("categoryId", true)}
            allowDeselect={false}
          />
          <TextInput
            label="Image URL"
            name="imageUrl"
            type="url"
            disabled={busy}
            value={values.imageUrl}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            placeholder="https://..."
            error={touched.imageUrl && errors.imageUrl}
          />
          <TextInput
            label="Product URL"
            name="productUrl"
            type="url"
            disabled={busy}
            value={values.productUrl}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            placeholder="https://..."
            error={touched.productUrl && errors.productUrl}
          />
        </Stack>
      </form>
    </AppModal>
  )
}

export const showProductModal = (props = {}) => showModal(ProductModal, props)

export default ProductModal
