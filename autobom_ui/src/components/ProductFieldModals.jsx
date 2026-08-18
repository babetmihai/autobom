import _ from "lodash"
import { useFormik } from "formik"
import { useSelector } from "react-redux"
import { useTranslation } from "react-i18next"
import {
  Button,
  Checkbox,
  Group,
  SimpleGrid,
  Stack,
  TextInput
} from "@mantine/core"
import { hideModal, showModal } from "../lib/modals.js"
import { showBanner } from "../lib/banner/index.js"
import {
  getActiveTags,
  PRODUCT_COLORS,
  PRODUCT_TAGS,
  selectProduct,
  updateProductColor,
  updateProductDimensions,
  updateProductTags
} from "../lib/products.js"
import { cn } from "../lib/index.js"
import AppModal from "./AppModal.jsx"

function ColorModal({ productId, onClose = hideModal }) {
  const { t } = useTranslation()
  const product = useSelector(() => selectProduct(productId))
  const { color = "" } = product || {}

  const formik = useFormik({
    enableReinitialize: true,
    initialValues: { color: color || "" },
    onSubmit: async (values, helpers) => {
      try {
        helpers.setSubmitting(true)
        await updateProductColor(productId, values.color)
        hideModal()
      } catch (error) {
        showBanner("error", error.message || t("could_not_save_product"))
        helpers.setSubmitting(false)
      }
    }
  })

  const { values, isSubmitting } = formik
  const busy = isSubmitting

  const onPick = (name) => {
    if (values.color === name) {
      formik.setFieldValue("color", "")
      return
    }
    formik.setFieldValue("color", name)
  }

  return (
    <AppModal
      name={t("edit_color")}
      onClose={onClose}
      className="max-w-[28rem]"
      contentClassName="overflow-visible"
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
            {t("save")}
          </Button>
        </Group>
      }
    >
      <div className="flex flex-wrap gap-2.5 overflow-visible p-1.5">
        {_.map(PRODUCT_COLORS, (hex, name) => {
          const selected = values.color === name
          return (
            <button
              key={name}
              type="button"
              disabled={busy}
              title={name}
              aria-label={t("color", { color: name })}
              aria-pressed={selected}
              onClick={() => onPick(name)}
              className={cn(
                "h-8 w-8 rounded-full border border-gray-300",
                selected && "ring-2 ring-brand-500 ring-offset-2"
              )}
              style={{ backgroundColor: hex }}
            />
          )
        })}
      </div>
    </AppModal>
  )
}

function DimensionsModal({ productId, onClose = hideModal }) {
  const { t } = useTranslation()
  const product = useSelector(() => selectProduct(productId))
  const { dimensions } = product || {}
  const { width, height, depth } = dimensions || {}

  const formik = useFormik({
    enableReinitialize: true,
    validateOnBlur: false,
    initialValues: {
      width: width == null ? "" : String(width),
      height: height == null ? "" : String(height),
      depth: depth == null ? "" : String(depth)
    },
    validate: (values) => {
      const errors = {}
      _.forEach(["width", "height", "depth"], (key) => {
        const raw = values[key]
        if (raw === "" || raw == null) return
        const n = Number(raw)
        if (!Number.isFinite(n) || n < 0) errors[key] = t("enter_a_valid_number")
      })
      return errors
    },
    onSubmit: async (values, helpers) => {
      try {
        helpers.setSubmitting(true)
        await updateProductDimensions(productId, values)
        hideModal()
      } catch (error) {
        showBanner("error", error.message || t("could_not_save_product"))
        helpers.setSubmitting(false)
      }
    }
  })

  const { values, errors, touched, isSubmitting } = formik
  const busy = isSubmitting

  return (
    <AppModal
      name={t("edit_dimensions")}
      onClose={onClose}
      className="max-w-[28rem]"
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
            {t("save")}
          </Button>
        </Group>
      }
    >
      <form onSubmit={formik.handleSubmit}>
        <SimpleGrid cols={3} spacing="sm">
          <TextInput
            label={t("width")}
            name="width"
            inputMode="decimal"
            data-autofocus
            disabled={busy}
            value={values.width}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={touched.width && errors.width}
            rightSection={<span className="pr-1 text-xs text-gray-400">{t("unit_cm")}</span>}
            rightSectionWidth={36}
          />
          <TextInput
            label={t("height")}
            name="height"
            inputMode="decimal"
            disabled={busy}
            value={values.height}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={touched.height && errors.height}
            rightSection={<span className="pr-1 text-xs text-gray-400">{t("unit_cm")}</span>}
            rightSectionWidth={36}
          />
          <TextInput
            label={t("depth")}
            name="depth"
            inputMode="decimal"
            disabled={busy}
            value={values.depth}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={touched.depth && errors.depth}
            rightSection={<span className="pr-1 text-xs text-gray-400">{t("unit_cm")}</span>}
            rightSectionWidth={36}
          />
        </SimpleGrid>
      </form>
    </AppModal>
  )
}

function TagsModal({ productId, onClose = hideModal }) {
  const { t } = useTranslation()
  const product = useSelector(() => selectProduct(productId))
  const { tags } = product || {}

  const formik = useFormik({
    enableReinitialize: true,
    initialValues: { tags: getActiveTags(tags) },
    onSubmit: async (values, helpers) => {
      try {
        helpers.setSubmitting(true)
        await updateProductTags(productId, values.tags)
        hideModal()
      } catch (error) {
        showBanner("error", error.message || t("could_not_save_product"))
        helpers.setSubmitting(false)
      }
    }
  })

  const { values, isSubmitting } = formik
  const busy = isSubmitting

  return (
    <AppModal
      name={t("edit_tags")}
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
            {t("save")}
          </Button>
        </Group>
      }
    >
      <Checkbox.Group
        value={values.tags}
        onChange={(next) => formik.setFieldValue("tags", next)}
      >
        <Stack gap="xs">
          <SimpleGrid cols={2} spacing="xs">
            {_.map(PRODUCT_TAGS, (tag) => (
              <Checkbox
                key={tag}
                value={tag}
                label={tag}
                disabled={busy}
                className="capitalize"
              />
            ))}
          </SimpleGrid>
        </Stack>
      </Checkbox.Group>
    </AppModal>
  )
}

export const showProductColorModal = (props = {}) => showModal(ColorModal, props)

export const showProductDimensionsModal = (props = {}) => showModal(DimensionsModal, props)

export const showProductTagsModal = (props = {}) => showModal(TagsModal, props)
