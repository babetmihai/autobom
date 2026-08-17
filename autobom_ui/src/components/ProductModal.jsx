import React from "react"
import _ from "lodash"
import { useFormik } from "formik"
import { useSelector } from "react-redux"
import { useHistory, useLocation } from "react-router-dom"
import { useTranslation } from "react-i18next"
import {
  Button,
  Group,
  SimpleGrid,
  Stack,
  Textarea,
  TextInput
} from "@mantine/core"
import { hideModal, showModal } from "../lib/modals.js"
import { showBanner } from "../lib/banner/index.js"
import {
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
  const { t } = useTranslation()
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
      if (!(values.name || "").trim()) errors.name = t("name_is_required")
      if (values.imageUrl && !/^https?:\/\//i.test(values.imageUrl.trim())) {
        errors.imageUrl = t("enter_valid_image_url")
      }
      if (values.productUrl && !/^https?:\/\//i.test(values.productUrl.trim())) {
        errors.productUrl = t("enter_valid_product_url")
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
        showBanner("error", error.message || t("could_not_save_product"))
        helpers.setSubmitting(false)
      }
    }
  })

  const { values, errors, touched, isSubmitting } = formik
  const busy = isSubmitting || isDeleting
  const name = (isEdit && t("edit_product")) || t("new_product")

  const onDelete = async () => {
    if (!window.confirm(t("delete_this_product"))) return
    try {
      setIsDeleting(true)
      await deleteProduct(productId)
      hideModal()
      if (location.pathname === `/product/${productId}`) history.push("/")
    } catch (error) {
      showBanner("error", error.message || t("could_not_delete_product"))
      setIsDeleting(false)
    }
  }

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
              {t("delete")}
            </Button>
          }
          <Button variant="default" disabled={busy} onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button
            color="brand"
            disabled={busy}
            loading={isSubmitting}
            onClick={formik.handleSubmit}
          >
            {t("save")}
          </Button>
        </Group>
      }
    >
      <form onSubmit={formik.handleSubmit}>
        <Stack gap="sm">
          <TextInput
            label={t("name")}
            name="name"
            autoFocus
            disabled={busy}
            value={values.name}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={touched.name && errors.name}
          />
          <TextInput
            label={t("title")}
            name="title"
            disabled={busy}
            value={values.title}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            placeholder={t("optional_display_title")}
          />
          <Textarea
            label={t("description")}
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
              label={t("sku")}
              name="sku"
              disabled={busy}
              value={values.sku}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
            />
            <TextInput
              label={t("price")}
              name="price"
              inputMode="decimal"
              disabled={busy}
              value={values.price}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
            />
          </SimpleGrid>
          <TextInput
            label={t("store_name")}
            name="storeName"
            disabled={busy}
            value={values.storeName}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
          />
          <TextInput
            label={t("image_url")}
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
            label={t("product_url")}
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
