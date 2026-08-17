import { actions } from "./store/index.js"
import {
  DEFAULT_PRODUCT_STATUS,
  EMPTY_OBJECT,
  PRODUCT_SOURCE,
  STEP_STATUS,
  TRUE,
  URL_IMPORT_PRODUCT_STATUS
} from "./index.js"
import { setLoader, clearLoader } from "./loaders.js"
import { createServices, getDocRef } from "./services.js"
import { getFirestoreDb, wakeTicker } from "./firebase.js"
import _ from "lodash"
import { v7 as uuidv7 } from "uuid"
import sketchup from "./sketchup.js"
import { showBanner } from "./banner/index.js"
import { selectAuthUid } from "./auth.js"
import i18n from "./i18n/index.js"
import React from "react"
import { useSelector } from "react-redux"
import { deleteField, onSnapshot, setDoc, updateDoc } from "firebase/firestore"

const PAGE_SIZE = 50
const IMPORT_UI_DELAY_MS = 75
const MAX_VISIBLE_TAGS = 4

const COLOR_HEX = {
  red: "#dc3c3c",
  blue: "#3c3cdc",
  green: "#3cb43c",
  yellow: "#e6dc3c",
  orange: "#e68c3c",
  purple: "#8c3cb4",
  pink: "#e678a0",
  brown: "#785032",
  black: "#1e1e1e",
  white: "#f0f0f0",
  gray: "#8c8c8c",
  beige: "#c8b496"
}

const productService = createServices("products")

export const CATEGORIES = {
  canapele: "canapele",
  fotolii: "fotolii",
  scaune: "scaune",
  taburete: "taburete",
  mese: "mese",
  depozitare: "depozitare",
  paturi: "paturi",
  iluminat: "iluminat",
  decor: "decor",
  exterior: "exterior"
}

const cacheBustedModelUrl = (url) => {
  if (!url) return url
  const sep = url.includes("?") ? "&" : "?"
  return `${url}${sep}_cb=${Date.now()}`
}

const downloadModelFile = (url, filename) => {
  const link = document.createElement("a")
  link.href = cacheBustedModelUrl(url)
  link.download = filename
  link.rel = "noopener noreferrer"
  link.target = "_blank"
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

const parsePrice = (price) => {
  if (price == null || price === "") return null
  const value = Number(price)
  return Number.isFinite(value) ? value : null
}

const mapProduct = (data) => {
  if (!data) return null

  const { categoryId: dataCategoryId, imageUrl } = data || {}
  const categoryId = dataCategoryId || null
  const category = categoryId ? CATEGORIES[categoryId] || null : null
  const title = data.title || data.name
  const subtitle = data.name && title !== data.name ? data.name : null
  const glbUrl = data.hasGlb === TRUE ? data.modelGlbUrl || null : null
  const bundleUrl = data.hasBundle === TRUE ? data.modelBundleUrl || null : null

  const source = data.source || null
  const sourceUrl = data.sourceUrl || null
  const productUrl = data.productUrl || sourceUrl || null

  return {
    id: data.id,
    name: data.name,
    title,
    subtitle,
    description: data.description || null,
    sku: data.sku || null,
    categoryId,
    category,
    price: parsePrice(data.price),
    currency: "RON",
    imageUrl: imageUrl || null,
    productUrl,
    source,
    sourceUrl,
    storeName: data.storeName || null,
    status: data.status || null,
    download_url: glbUrl || bundleUrl,
    glbUrl,
    bundleUrl,
    hasGlb: data.hasGlb === TRUE,
    hasBundle: data.hasBundle === TRUE,
    hasModel: Boolean(glbUrl || bundleUrl),
    color: data.color || null,
    dimensions: data.dimensions || null,
    tags: data.tags || null
  }
}

export const mapRawProduct = (data) => {
  const mapped = mapProduct(data)
  return mapped ? toProductItem(mapped) : null
}

export const resolveProductView = (product) => {
  if (!product) return product

  return {
    ...product,
    glbUrl: product.hasGlb ? product.glbUrl : null,
    bundleUrl: product.hasBundle ? product.bundleUrl : null
  }
}

const buildListQuery = ({ search, categoryId, hasGlb, hasBundle, lastId, createdBy }) => {
  const query = { pageSize: PAGE_SIZE, createdBy }
  const trimmedSearch = search?.trim?.()
  if (trimmedSearch) query.search = trimmedSearch
  if (categoryId) query.categoryId = categoryId
  if (hasGlb) query.hasGlb = "TRUE"
  if (hasBundle) query.hasBundle = "TRUE"
  if (lastId) query.lastId = lastId
  return query
}

const resolveProducts = (rawProducts) => {
  return rawProducts
    .map((item) => mapProduct(item))
    .filter(Boolean)
    .map((product) => toProductItem(product))
}

const updateProductsMeta = (rawProducts) => {
  const hasMore = rawProducts.length === PAGE_SIZE
  const lastId = rawProducts.length ? rawProducts[rawProducts.length - 1].id : null
  actions.set("productsMeta", { lastId, hasMore })
}

export const selectProducts = () => actions.get("products", EMPTY_OBJECT)

export const selectProduct = (id) => selectProducts()[id] || null

export const fetchProduct = async (id) => {
  if (!id) return null

  const cached = selectProduct(id)
  if (cached) return cached

  const createdBy = selectAuthUid()
  if (!createdBy) return null

  setLoader(`product.${id}`)
  try {
    const raw = await productService.get(id)
    if (!raw) {
      showBanner("error", i18n.t("product_not_found"))
      return null
    }

    const mapped = mapProduct(raw)
    if (!mapped) return null

    const item = toProductItem(mapped)
    actions.update("products", (products = {}) => ({ ...products, [id]: item }))
    return item
  } catch (error) {
    showBanner("error", error.message || i18n.t("could_not_load_product"))
    return null
  } finally {
    clearLoader(`product.${id}`)
  }
}

export const selectCategories = () => CATEGORIES

export const selectProductsMeta = () => actions.get("productsMeta", { lastId: null, hasMore: false })

export const fetchProducts = async ({
  reset = true,
  search = "",
  categoryId = "",
  hasGlb = false,
  hasBundle = false
} = {}) => {
  const createdBy = selectAuthUid()
  if (!createdBy) return

  try {
    setLoader("loadProducts")
    const rawProducts = await productService.list(buildListQuery({
      search,
      categoryId,
      hasGlb,
      hasBundle,
      createdBy
    }))
    const list = resolveProducts(rawProducts)
    if (reset) {
      actions.set("products", _.keyBy(list, "id"))
    } else {
      actions.update("products", _.keyBy(list, "id"))
    }
    updateProductsMeta(rawProducts)
    sketchup.getDocumentUsage()
  } catch (error) {
    showBanner("error", error.message)
  } finally {
    clearLoader("loadProducts")
  }
}

const hashSourceUrl = async (sourceUrl) => {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(sourceUrl))
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
}

const hostFromUrl = (sourceUrl) => {
  const host = new URL(sourceUrl).hostname || ""
  return host.replace(/^www\./, "")
}

const applyProductSnapshot = (productId, raw) => {
  const mapped = mapProduct(raw)
  if (!mapped) return
  actions.update("products", (products = {}) => ({
    ...products,
    [productId]: toProductItem(mapped)
  }))
}

export const isUrlSource = (product) => {
  const { source } = product || {}
  return source === PRODUCT_SOURCE.URL
}

export const isScrapePending = (product) => {
  const { scrape } = (product && product.status) || {}
  return scrape === STEP_STATUS.PENDING || scrape === STEP_STATUS.PROCESSING
}

export const hasFailedSteps = (product) => {
  const { status } = product || {}
  return _.some(status, (value) => value === STEP_STATUS.FAILED)
}

export const retryProduct = async (product) => {
  const { id, status } = product || {}
  const db = getFirestoreDb()
  if (!db) throw new Error(i18n.t("firebase_not_configured"))
  if (!id) throw new Error(i18n.t("product_id_required"))

  const failedSteps = _.keys(status || {}).filter((key) => status[key] === STEP_STATUS.FAILED)
  if (!failedSteps.length) return

  const patch = { updatedAt: Date.now() }
  _.forEach(failedSteps, (step) => {
    patch[`status.${step}`] = STEP_STATUS.PENDING
  })
  const retryingTrellis = _.includes(failedSteps, "trellis")
  if (retryingTrellis) patch.trellisRequestId = deleteField()

  await updateDoc(getDocRef("products", id), patch)
  void wakeTicker()

  actions.update("products", (products = {}) => {
    const current = products[id] || { id }
    const nextStatus = { ...(current.status || {}) }
    _.forEach(failedSteps, (step) => {
      nextStatus[step] = STEP_STATUS.PENDING
    })
    const next = {
      ...current,
      status: nextStatus,
      updatedAt: patch.updatedAt
    }
    if (retryingTrellis) delete next.trellisRequestId
    return {
      ...products,
      [id]: toProductItem(next)
    }
  })
}

export const productToFormValues = (product) => {
  const {
    name = "",
    title = "",
    description = "",
    sku = "",
    price = "",
    imageUrl = "",
    productUrl = "",
    storeName = "",
    categoryId = ""
  } = product || {}

  return {
    name: name || "",
    title: title || "",
    description: description || "",
    sku: sku || "",
    price: price == null ? "" : String(price),
    imageUrl: imageUrl || "",
    productUrl: productUrl || "",
    storeName: storeName || "",
    categoryId: categoryId || ""
  }
}

const formValuesToPayload = (values) => {
  const name = (values.name || "").trim()
  const title = (values.title || name).trim()
  return _.omitBy({
    name,
    title,
    description: (values.description || "").trim() || null,
    sku: (values.sku || "").trim() || null,
    price: values.price === "" || values.price == null ? null : String(values.price),
    imageUrl: (values.imageUrl || "").trim() || null,
    productUrl: (values.productUrl || "").trim() || null,
    storeName: (values.storeName || "").trim() || null,
    categoryId: values.categoryId || null
  }, _.isNil)
}

export const createProduct = async (values) => {
  const createdBy = selectAuthUid()
  const db = getFirestoreDb()
  if (!db) throw new Error(i18n.t("firebase_not_configured"))
  if (!createdBy) throw new Error(i18n.t("sign_in_required"))

  const id = uuidv7()
  const now = Date.now()
  const payload = formValuesToPayload(values)
  if (!payload.name) throw new Error(i18n.t("name_is_required"))

  const raw = {
    _active: TRUE,
    id,
    createdBy,
    ...payload,
    status: { ...DEFAULT_PRODUCT_STATUS },
    createdAt: now,
    updatedAt: now
  }

  await setDoc(getDocRef("products", id), raw)
  applyProductSnapshot(id, raw)
  void wakeTicker()
  showBanner("success", i18n.t("product_created"))
  return selectProduct(id)
}

export const updateProduct = async (id, values) => {
  const db = getFirestoreDb()
  if (!db) throw new Error(i18n.t("firebase_not_configured"))
  if (!id) throw new Error(i18n.t("product_id_required"))

  const payload = formValuesToPayload(values)
  if (!payload.name) throw new Error(i18n.t("name_is_required"))

  const patch = {
    ...payload,
    updatedAt: Date.now()
  }
  await updateDoc(getDocRef("products", id), patch)

  actions.update("products", (products = {}) => {
    const current = products[id] || { id }
    return {
      ...products,
      [id]: toProductItem({
        ...current,
        ...payload,
        price: parsePrice(payload.price),
        title: payload.title || payload.name,
        updatedAt: patch.updatedAt
      })
    }
  })
  showBanner("success", i18n.t("product_saved"))
  return selectProduct(id)
}

export const deleteProduct = async (id) => {
  const db = getFirestoreDb()
  if (!db) throw new Error(i18n.t("firebase_not_configured"))
  if (!id) throw new Error(i18n.t("product_id_required"))

  await updateDoc(getDocRef("products", id), {
    _active: deleteField(),
    updatedAt: Date.now()
  })
  actions.unset(`products.${id}`)
  showBanner("success", i18n.t("product_deleted"))
}

export const importProductFromUrl = async (url) => {
  const createdBy = selectAuthUid()
  const sourceUrl = (url || "").trim()
  const db = getFirestoreDb()
  if (!db) {
    showBanner("error", i18n.t("firebase_not_configured"))
    return null
  }
  if (!createdBy) {
    showBanner("error", i18n.t("sign_in_required"))
    return null
  }
  if (!sourceUrl) {
    showBanner("error", i18n.t("enter_a_product_url"))
    return null
  }

  setLoader("products.importFromUrl")
  try {
    const id = await hashSourceUrl(sourceUrl)
    const cached = selectProduct(id)
    if (cached) {
      showBanner("info", i18n.t("product_already_imported"))
      return id
    }

    const now = Date.now()
    const storeName = hostFromUrl(sourceUrl)
    const name = i18n.t("importing_from", { store: storeName })
    const raw = {
      _active: TRUE,
      id,
      name,
      title: name,
      source: PRODUCT_SOURCE.URL,
      sourceUrl,
      productUrl: sourceUrl,
      storeName,
      createdBy,
      status: { ...URL_IMPORT_PRODUCT_STATUS },
      createdAt: now,
      updatedAt: now
    }

    await setDoc(getDocRef("products", id), raw)
    applyProductSnapshot(id, raw)
    void wakeTicker()
    showBanner("success", i18n.t("product_added_scraping"))
    return id
  } catch (error) {
    showBanner("error", error.message || i18n.t("import_failed"))
    return null
  } finally {
    clearLoader("products.importFromUrl")
  }
}

export const useProductListener = (productId) => {
  React.useEffect(() => {
    if (!productId) return

    const docRef = getDocRef("products", productId)
    return onSnapshot(docRef, (snap) => {
      if (!snap.exists()) return
      applyProductSnapshot(productId, snap.data())
    })
  }, [productId])
}

export const usePendingUrlImportListeners = () => {
  const pendingKey = useSelector(() => {
    const products = selectProducts()
    return Object.values(products)
      .filter((product) => isUrlSource(product) && isScrapePending(product))
      .map((product) => product.id)
      .sort()
      .join(",")
  })

  React.useEffect(() => {
    if (!pendingKey) return undefined

    const pendingIds = pendingKey.split(",")
    const unsubs = pendingIds.map((productId) =>
      onSnapshot(getDocRef("products", productId), (snap) => {
        if (!snap.exists()) return
        applyProductSnapshot(productId, snap.data())
      })
    )
    return () => unsubs.forEach((unsub) => unsub())
  }, [pendingKey])
}

export const loadMoreProducts = async ({
  search = "",
  categoryId = "",
  hasGlb = false,
  hasBundle = false
} = {}) => {
  const createdBy = selectAuthUid()
  const { lastId, hasMore } = selectProductsMeta()
  if (!createdBy || !hasMore || !lastId) return

  try {
    setLoader("loadMoreProducts")
    const rawProducts = await productService.list(buildListQuery({
      search,
      categoryId,
      hasGlb,
      hasBundle,
      lastId,
      createdBy
    }))
    const list = resolveProducts(rawProducts)
    actions.update("products", (products = {}) => ({ ...products, ..._.keyBy(list, "id") }))
    updateProductsMeta(rawProducts)
  } catch (error) {
    showBanner("error", error.message)
  } finally {
    clearLoader("loadMoreProducts")
  }
}

export const importProductGlb = async (product) => {
  const { id, glbUrl } = product
  const loaderPath = `importingModel.glb.${id}`
  try {
    if (!glbUrl) throw new Error(i18n.t("no_glb_file"))
    setLoader(loaderPath)
    await new Promise(resolve => setTimeout(resolve, IMPORT_UI_DELAY_MS))
    if (!sketchup.isInSketchup()) {
      downloadModelFile(glbUrl, `${id}.glb`)
      showBanner("success", i18n.t("glb_download_started"))
      clearLoader(loaderPath)
      return
    }
    sketchup.importModel({ id, model_url: cacheBustedModelUrl(glbUrl), source: "glb" })
  } catch (error) {
    showBanner("error", error.message)
    clearLoader(loaderPath)
  }
}

export const importProductBundle = async (product) => {
  const { id, bundleUrl } = product
  const loaderPath = `importingModel.dae.${id}`
  try {
    if (!bundleUrl) throw new Error(i18n.t("no_collada_bundle"))
    setLoader(loaderPath)
    await new Promise(resolve => setTimeout(resolve, IMPORT_UI_DELAY_MS))
    if (!sketchup.isInSketchup()) {
      downloadModelFile(bundleUrl, `${id}.zip`)
      showBanner("success", i18n.t("collada_download_started"))
      clearLoader(loaderPath)
      return
    }
    sketchup.importModel({ id, model_url: cacheBustedModelUrl(bundleUrl), source: "collada" })
  } catch (error) {
    showBanner("error", error.message)
    clearLoader(loaderPath)
  }
}

export const importProduct = importProductGlb

export const addOrImportProduct = async (product, { inSketchup, glbSupported } = {}) => {
  const { id, glbUrl, bundleUrl } = product || {}
  if (!id || !inSketchup) return

  if (glbUrl && glbSupported) {
    await importProductGlb(product)
    return
  }
  if (bundleUrl) {
    await importProductBundle(product)
    return
  }
  if (glbUrl && !glbSupported) {
    showBanner("error", i18n.t("glb_requires_sketchup_2025"))
    return
  }
  showBanner("error", i18n.t("this_product_has_no_importable_model"))
}

export const useImportListener = () => {
  React.useEffect(() => {
    const onImportDone = (payload) => {
      const { id, ok, message } = payload || {}
      if (id) {
        clearLoader(`importingModel.glb.${id}`)
        clearLoader(`importingModel.dae.${id}`)
      }
      if (_.isEmpty(payload) || !ok) {
        showBanner("error", message)
      } else {
        showBanner("success", i18n.t("model_imported_successfully"))
        sketchup.getDocumentUsage()
      }
    }

    window.__importDone = onImportDone
    return () => {
      if (window.__importDone === onImportDone) delete window.__importDone
    }
  }, [])
}

export const toProductItem = (values) => {
  const { id, ...rest } = values
  return {
    id,
    ...rest
  }
}

export const formatPrice = (price, currency) => {
  if (price == null) return null
  return `${price.toLocaleString()} ${currency || "RON"}`
}

export const colorToHex = (color) => {
  if (!color) return null
  return COLOR_HEX[String(color).toLowerCase()] || null
}

export const getActiveTags = (tags) => {
  if (!tags || typeof tags !== "object") return []
  return Object.entries(tags)
    .filter(([, value]) => value === TRUE)
    .map(([key]) => key)
    .sort()
}

export const formatDimensions = (dimensions) => {
  if (!dimensions) return null
  const { width, height, depth } = dimensions
  const hasWidth = width != null
  const hasHeight = height != null
  const hasDepth = depth != null
  if (!hasWidth && !hasHeight && !hasDepth) return null
  if (hasWidth && hasHeight && hasDepth) {
    return i18n.t("dimensions_full", { width, height, depth })
  }
  const parts = []
  if (hasWidth) parts.push(i18n.t("width_abbr", { value: width }))
  if (hasHeight) parts.push(i18n.t("height_abbr", { value: height }))
  if (hasDepth) parts.push(i18n.t("depth_abbr", { value: depth }))
  return i18n.t("dimensions_parts", { parts: parts.join(" · ") })
}

export const getVisibleTags = (tags, max = MAX_VISIBLE_TAGS) => {
  const active = getActiveTags(tags)
  const visible = active.slice(0, max)
  const overflow = active.length - visible.length
  return { visible, overflow }
}
