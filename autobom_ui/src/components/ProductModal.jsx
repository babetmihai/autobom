import React from "react"
import _ from "lodash"
import { useFormik } from "formik"
import { useSelector } from "react-redux"
import { useTranslation } from "react-i18next"
import {
  Button,
  Group,
  Input,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
  TextInput
} from "@mantine/core"
import { IconPhoto, IconUpload } from "@tabler/icons-react"
import { hideModal, showModal } from "../lib/modals.js"
import { showBanner } from "../lib/banner/index.js"
import {
  createProduct,
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
  const product = useSelector(() => selectProduct(productId))
  const isEdit = Boolean(productId)
  const [imageFile, setImageFile] = React.useState(null)
  const [imagePreview, setImagePreview] = React.useState(null)
  const imageInputRef = React.useRef(null)

  React.useEffect(() => {
    if (!imageFile) {
      setImagePreview(null)
      return
    }
    const url = URL.createObjectURL(imageFile)
    setImagePreview(url)
    return () => URL.revokeObjectURL(url)
  }, [imageFile])

  const formik = useFormik({
    enableReinitialize: true,
    validateOnBlur: false,
    initialValues: { ...productToFormValues(product), image: "" },
    validate: (values) => {
      const errors = {}
      if (!(values.name || "").trim()) errors.name = t("name_is_required")
      if (values.productUrl && !/^https?:\/\//i.test(values.productUrl.trim())) {
        errors.productUrl = t("enter_valid_product_url")
      }
      if (!isEdit && !(values.image || "").trim()) errors.image = t("image_is_required")
      return errors
    },
    onSubmit: async (values, helpers) => {
      try {
        helpers.setSubmitting(true)
        let item
        if (isEdit) {
          item = await updateProduct(productId, values)
        } else {
          item = await createProduct(values, imageFile)
        }
        await onSubmit(item)
        hideModal()
      } catch (error) {
        console.error(error)
        showBanner("error", error.message || t("could_not_save_product"))
        helpers.setSubmitting(false)
      }
    }
  })

  const { values, errors, touched, isSubmitting } = formik
  const busy = isSubmitting
  const name = (isEdit && t("edit_product")) || t("new_product")
  const canReplace = Boolean(imagePreview)
  const imageError = touched.image && errors.image
  const imageButtonStyle = {}
  if (imageError) imageButtonStyle.borderColor = "var(--mantine-color-error)"

  const openImagePicker = () => {
    if (busy) return
    imageInputRef.current?.click()
  }

  return (
    <AppModal
      name={name}
      onClose={onClose}
      className="max-w-[32rem]"
      footer={
        <Group justify="flex-end" gap="xs">
          <Button variant="default" disabled={busy} onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button
            color="brand"
            disabled={busy}
            loading={isSubmitting}
            onClick={formik.handleSubmit}
          >
            {(isEdit && t("save")) || t("submit")}
          </Button>
        </Group>
      }
    >
      <form onSubmit={formik.handleSubmit}>
        <Stack gap="sm">
          <TextInput
            label={t("name")}
            name="name"
            data-autofocus
            disabled={busy}
            value={values.name}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={touched.name && errors.name}
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
          {!isEdit &&
            <Input.Wrapper label={t("image")} error={imageError}>
              <Group align="flex-end" gap="sm" wrap="nowrap">
                <button
                  type="button"
                  className="box-border h-[7.5rem] w-[7.5rem] shrink-0 cursor-pointer appearance-none overflow-hidden rounded-xl border border-gray-200 bg-gray-100 p-0"
                  style={imageButtonStyle}
                  disabled={busy}
                  onClick={openImagePicker}
                  aria-label={(canReplace && t("replace_image")) || t("upload_image")}
                >
                  {imagePreview &&
                    <img src={imagePreview} alt="" className="h-full w-full object-cover" />
                  }
                  {!imagePreview &&
                    <span className="flex h-full w-full items-center justify-center text-gray-400">
                      <IconPhoto size={48} stroke={1.5} />
                    </span>
                  }
                </button>
                <Stack gap={4}>
                  <Button
                    type="button"
                    variant="default"
                    disabled={busy}
                    leftSection={<IconUpload size={16} stroke={1.75} />}
                    onClick={openImagePicker}
                  >
                    {canReplace && t("replace_image")}
                    {!canReplace && t("upload_image")}
                  </Button>
                  {imageFile &&
                    <Text size="xs" c="dimmed">{imageFile.name}</Text>
                  }
                  {!imageFile &&
                    <Text size="xs" c="dimmed">{t("jpeg_png_or_webp")}</Text>
                  }
                </Stack>
              </Group>
              <input
                ref={imageInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                disabled={busy}
                onChange={(event) => {
                  const file = _.first(event.target.files)
                  event.target.value = ""
                  if (!file || !_.includes(["image/jpeg", "image/png", "image/webp"], file.type)) return
                  setImageFile(file)
                  formik.setFieldValue("image", file.name)
                }}
              />
            </Input.Wrapper>
          }
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
