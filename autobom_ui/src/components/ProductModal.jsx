import React from "react"
import _ from "lodash"
import { useFormik } from "formik"
import { useSelector } from "react-redux"
import { useHistory, useLocation } from "react-router-dom"
import { cn } from "../lib/index.js"
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
import { LoadingSpinnerIcon } from "./Icons.jsx"
import AppModal from "./AppModal.jsx"


const FIELD_CLASS = cn(
  "w-full rounded-lg border border-neutral-200 bg-white px-3 py-2",
  "font-[inherit] text-[0.875rem] outline-none",
  "focus:border-brand focus:ring-[3px] focus:ring-brand/15",
  "disabled:opacity-60"
)

const LABEL_CLASS = "flex flex-col gap-1.5"

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

  return (
    <AppModal
      name={name}
      onClose={onClose}
      className="max-w-[32rem]"
      footer={
        <>
          {isEdit &&
            <button
              type="button"
              className="ab-btn-toolbar mr-auto text-red-600 hover:bg-red-50 hover:text-red-700"
              disabled={busy}
              onClick={onDelete}
            >
              {isDeleting &&
                <LoadingSpinnerIcon className="h-4 w-4 animate-spin" />
              }
              {isDeleting && "Deleting..."}
              {!isDeleting && "Delete"}
            </button>
          }
          <button
            type="button"
            className="ab-btn-toolbar"
            disabled={busy}
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="ab-btn-brand"
            disabled={busy}
            onClick={formik.handleSubmit}
          >
            {isSubmitting &&
              <LoadingSpinnerIcon className="h-4 w-4 animate-spin" />
            }
            {isSubmitting && "Saving..."}
            {!isSubmitting && "Save"}
          </button>
        </>
      }
    >
      <form
        className="flex flex-col gap-3"
        onSubmit={formik.handleSubmit}
      >
        <label className={LABEL_CLASS}>
          <span className="text-[0.75rem] font-medium text-neutral-600">Name</span>
          <input
            id="name"
            name="name"
            autoFocus
            disabled={busy}
            value={values.name}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            className={FIELD_CLASS}
          />
          {touched.name && errors.name &&
            <span className="text-[0.6875rem] text-red-600">{errors.name}</span>
          }
        </label>

        <label className={LABEL_CLASS}>
          <span className="text-[0.75rem] font-medium text-neutral-600">Title</span>
          <input
            id="title"
            name="title"
            disabled={busy}
            value={values.title}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            className={FIELD_CLASS}
            placeholder="Optional display title"
          />
        </label>

        <label className={LABEL_CLASS}>
          <span className="text-[0.75rem] font-medium text-neutral-600">Description</span>
          <textarea
            id="description"
            name="description"
            rows={3}
            disabled={busy}
            value={values.description}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            className={cn(FIELD_CLASS, "resize-y")}
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className={LABEL_CLASS}>
            <span className="text-[0.75rem] font-medium text-neutral-600">SKU</span>
            <input
              id="sku"
              name="sku"
              disabled={busy}
              value={values.sku}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              className={FIELD_CLASS}
            />
          </label>
          <label className={LABEL_CLASS}>
            <span className="text-[0.75rem] font-medium text-neutral-600">Price</span>
            <input
              id="price"
              name="price"
              type="text"
              inputMode="decimal"
              disabled={busy}
              value={values.price}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              className={FIELD_CLASS}
            />
          </label>
        </div>

        <label className={LABEL_CLASS}>
          <span className="text-[0.75rem] font-medium text-neutral-600">Store name</span>
          <input
            id="storeName"
            name="storeName"
            disabled={busy}
            value={values.storeName}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            className={FIELD_CLASS}
          />
        </label>

        <label className={LABEL_CLASS}>
          <span className="text-[0.75rem] font-medium text-neutral-600">Category</span>
          <select
            id="categoryId"
            name="categoryId"
            disabled={busy}
            value={values.categoryId}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            className={FIELD_CLASS}
          >
            <option value="">No category</option>
            {Object.entries(CATEGORIES).map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        </label>

        <label className={LABEL_CLASS}>
          <span className="text-[0.75rem] font-medium text-neutral-600">Image URL</span>
          <input
            id="imageUrl"
            name="imageUrl"
            type="url"
            disabled={busy}
            value={values.imageUrl}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            className={FIELD_CLASS}
            placeholder="https://..."
          />
          {touched.imageUrl && errors.imageUrl &&
            <span className="text-[0.6875rem] text-red-600">{errors.imageUrl}</span>
          }
        </label>

        <label className={LABEL_CLASS}>
          <span className="text-[0.75rem] font-medium text-neutral-600">Product URL</span>
          <input
            id="productUrl"
            name="productUrl"
            type="url"
            disabled={busy}
            value={values.productUrl}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            className={FIELD_CLASS}
            placeholder="https://..."
          />
          {touched.productUrl && errors.productUrl &&
            <span className="text-[0.6875rem] text-red-600">{errors.productUrl}</span>
          }
        </label>
      </form>
    </AppModal>
  )
}

export const showProductModal = (props = {}) => showModal(ProductModal, props)

export default ProductModal
