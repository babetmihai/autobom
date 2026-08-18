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
import { getFirebaseStorage, getFirestoreDb, wakeTicker } from "./firebase.js"
import _ from "lodash"
import { v7 as uuidv7 } from "uuid"
import sketchup from "./sketchup.js"
import { showBanner } from "./banner/index.js"
import { selectAuthUid } from "./auth.js"
import i18n from "./i18n/index.js"
import React from "react"
import { useSelector } from "react-redux"
import { deleteField, onSnapshot, setDoc, updateDoc } from "firebase/firestore"
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"

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

export const PRODUCT_COLORS = COLOR_HEX

export const PRODUCT_TAGS = [
  "chair",
  "armchair",
  "sofa",
  "sectional",
  "stool",
  "bench",
  "ottoman",
  "table",
  "desk",
  "coffee table",
  "dining table",
  "side table",
  "console",
  "nightstand",
  "cabinet",
  "dresser",
  "wardrobe",
  "shelf",
  "bookcase",
  "sideboard",
  "bed",
  "headboard",
  "mirror",
  "lamp",
  "pendant",
  "chandelier",
  "rug",
  "planter",
  "wood",
  "metal",
  "fabric",
  "leather",
  "velvet",
  "linen",
  "rattan",
  "wicker",
  "glass",
  "marble",
  "stone",
  "ceramic",
  "concrete",
  "upholstered",
  "modern",
  "industrial",
  "mid-century",
  "minimalist",
  "traditional",
  "rustic"
]

const productService = createServices("products")

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

  const { imageUrl } = data || {}
  const glbUrl = data.hasGlb === TRUE ? data.modelGlbUrl || null : null
  const bundleUrl = data.hasBundle === TRUE ? data.modelBundleUrl || null : null

  const source = data.source || null
  const sourceUrl = data.sourceUrl || null
  const productUrl = data.productUrl || sourceUrl || null

  return {
    id: data.id,
    name: data.name,
    description: data.description || null,
    sku: data.sku || null,
    price: parsePrice(data.price),
    currency: "RON",
    imageUrl: imageUrl || null,
    productUrl,
    source,
    sourceUrl,
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

export const PRODUCT_MODEL_ASSET_KINDS = ["glb", "colada"]

const ASSET_STEP = {
  glb: "trellis",
  colada: "colada"
}

export const getProductAssetView = (product, kind) => {
  const view = resolveProductView(product)
  if (!view) return null

  const { glbUrl, bundleUrl, status } = view || {}
  const urlByKind = {
    glb: glbUrl,
    colada: bundleUrl
  }
  const url = urlByKind[kind] || null
  const stepStatus = (status || {})[ASSET_STEP[kind]]
  const processing = stepStatus === STEP_STATUS.PROCESSING
  const waiting = stepStatus === STEP_STATUS.PENDING
  const failed = stepStatus === STEP_STATUS.FAILED
  const available = Boolean(url)

  let statusKey = "not_generated"
  let statusColor = "gray"
  if (available) {
    statusKey = "ready"
    statusColor = "green"
  }
  if (waiting && !available) {
    statusKey = "waiting"
    statusColor = "gray"
  }
  if (processing && !available) {
    statusKey = "processing"
    statusColor = "yellow"
  }
  if (failed && !available) {
    statusKey = "failed"
    statusColor = "red"
  }

  return {
    ...view,
    kind,
    url,
    available,
    processing,
    waiting,
    failed,
    statusKey,
    statusColor
  }
}

const analysisFieldStatus = (stepStatus, hasValue) => {
  const processing = stepStatus === STEP_STATUS.PROCESSING
  const waiting = stepStatus === STEP_STATUS.PENDING
  const failed = stepStatus === STEP_STATUS.FAILED
  const generating = processing || waiting
  let statusKey = "not_generated"
  if (hasValue) statusKey = "ready"
  if (waiting) statusKey = "waiting"
  if (processing) statusKey = "processing"
  if (failed && !hasValue) statusKey = "failed"
  return { hasValue, generating, failed: failed && !hasValue, statusKey }
}

export const getProductAnalysisView = (product) => {
  const view = resolveProductView(product)
  if (!view) return null

  const { color, dimensions, tags, status } = view || {}
  const { image, text } = status || {}
  const activeTags = getActiveTags(tags)
  const dimensionsDisplay = formatDimensions(dimensions)
  const imageBusy = image === STEP_STATUS.PENDING || image === STEP_STATUS.PROCESSING
  const textBusy = text === STEP_STATUS.PENDING || text === STEP_STATUS.PROCESSING

  let tagsStep = STEP_STATUS.COMPLETED
  if (image === STEP_STATUS.PROCESSING || text === STEP_STATUS.PROCESSING) {
    tagsStep = STEP_STATUS.PROCESSING
  } else if (imageBusy || textBusy) {
    tagsStep = STEP_STATUS.PENDING
  } else if (!activeTags.length && (image === STEP_STATUS.FAILED || text === STEP_STATUS.FAILED)) {
    tagsStep = STEP_STATUS.FAILED
  }

  return {
    color: {
      value: color || null,
      hex: colorToHex(color),
      ...analysisFieldStatus(image, Boolean(color))
    },
    dimensions: {
      display: dimensionsDisplay,
      ...analysisFieldStatus(text, Boolean(dimensionsDisplay))
    },
    tags: {
      value: activeTags,
      ...analysisFieldStatus(tagsStep, activeTags.length > 0)
    },
    canRetry: image === STEP_STATUS.FAILED || text === STEP_STATUS.FAILED
  }
}

const buildListQuery = ({ search, hasGlb, hasBundle, lastId, createdBy }) => {
  const query = { pageSize: PAGE_SIZE, createdBy }
  const trimmedSearch = search?.trim?.()
  if (trimmedSearch) query.search = trimmedSearch
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

export const selectProductsMeta = () => actions.get("productsMeta", { lastId: null, hasMore: false })

export const fetchProducts = async ({
  reset = true,
  search = "",
  hasGlb = false,
  hasBundle = false
} = {}) => {
  const createdBy = selectAuthUid()
  if (!createdBy) return

  try {
    setLoader("loadProducts")
    const rawProducts = await productService.list(buildListQuery({
      search,
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

export const isProductProcessing = (product) => {
  const { status } = product || {}
  return _.some(status, (value) => value === STEP_STATUS.PENDING || value === STEP_STATUS.PROCESSING)
}

export const getProductPipelineView = (product) => {
  if (hasFailedSteps(product)) {
    return { label: i18n.t("failed"), color: "red", failed: true, generating: false }
  }
  if (isProductProcessing(product)) {
    return { label: i18n.t("processing"), color: "yellow", failed: false, generating: true }
  }
  return { label: i18n.t("ready"), color: "green", failed: false, generating: false }
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

export const reprocessProduct = async (product) => {
  const { id, status, lockedStep } = product || {}
  const db = getFirestoreDb()
  if (!db) throw new Error(i18n.t("firebase_not_configured"))
  if (!id) throw new Error(i18n.t("product_id_required"))

  const nextStatus = {
    ...(status || {}),
    image: STEP_STATUS.PENDING,
    text: STEP_STATUS.PENDING
  }
  const patch = {
    updatedAt: Date.now(),
    "status.image": STEP_STATUS.PENDING,
    "status.text": STEP_STATUS.PENDING,
    tags: deleteField(),
    color: deleteField(),
    dimensions: deleteField()
  }
  const analysisLocked = lockedStep === "image" || lockedStep === "text"
  if (analysisLocked) {
    patch.lockedBy = deleteField()
    patch.lockedAt = deleteField()
    patch.lockedStep = deleteField()
  }

  await updateDoc(getDocRef("products", id), patch)
  void wakeTicker()

  actions.update("products", (products = {}) => {
    const current = products[id] || { id }
    const next = {
      ...current,
      status: nextStatus,
      updatedAt: patch.updatedAt,
      tags: null,
      color: null,
      dimensions: null
    }
    if (analysisLocked) {
      delete next.lockedBy
      delete next.lockedAt
      delete next.lockedStep
    }
    return {
      ...products,
      [id]: toProductItem(next)
    }
  })
}

export const reprocessProductAsset = async (product, kind) => {
  const { id, status } = product || {}
  const db = getFirestoreDb()
  if (!db) throw new Error(i18n.t("firebase_not_configured"))
  if (!id) throw new Error(i18n.t("product_id_required"))

  const loaderPath = `deletingAsset.${kind}.${id}`
  const updatedAt = Date.now()
  const nextStatus = { ...(status || {}) }
  const patch = { updatedAt }

  if (kind === "glb") {
    patch.hasGlb = deleteField()
    patch.modelGlbUrl = deleteField()
    patch.trellisRequestId = deleteField()
    patch.hasBundle = deleteField()
    patch.modelBundleUrl = deleteField()
    patch["status.trellis"] = STEP_STATUS.PENDING
    patch["status.colada"] = STEP_STATUS.PENDING
    nextStatus.trellis = STEP_STATUS.PENDING
    nextStatus.colada = STEP_STATUS.PENDING
  }
  if (kind === "colada") {
    patch.hasBundle = deleteField()
    patch.modelBundleUrl = deleteField()
    patch["status.colada"] = STEP_STATUS.PENDING
    nextStatus.colada = STEP_STATUS.PENDING
  }

  try {
    setLoader(loaderPath)
    await updateDoc(getDocRef("products", id), patch)
    void wakeTicker()
    actions.update("products", (products = {}) => {
      const current = products[id] || { id }
      const next = {
        ...current,
        status: nextStatus,
        updatedAt
      }
      if (kind === "glb") {
        next.hasGlb = false
        next.glbUrl = null
        next.hasBundle = false
        next.bundleUrl = null
        delete next.trellisRequestId
      }
      if (kind === "colada") {
        next.hasBundle = false
        next.bundleUrl = null
      }
      next.hasModel = Boolean(next.glbUrl || next.bundleUrl)
      next.download_url = next.glbUrl || next.bundleUrl || null
      return {
        ...products,
        [id]: toProductItem(next)
      }
    })
  } catch (error) {
    showBanner("error", error.message)
  } finally {
    clearLoader(loaderPath)
  }
}

export const productToFormValues = (product) => {
  const {
    name = "",
    description = "",
    sku = "",
    price = "",
    productUrl = ""
  } = product || {}

  return {
    name: name || "",
    description: description || "",
    sku: sku || "",
    price: price == null ? "" : String(price),
    productUrl: productUrl || ""
  }
}

const formValuesToPayload = (values) => {
  const name = (values.name || "").trim()
  return _.omitBy({
    name,
    description: (values.description || "").trim() || null,
    sku: (values.sku || "").trim() || null,
    price: values.price === "" || values.price == null ? null : String(values.price),
    productUrl: (values.productUrl || "").trim() || null
  }, _.isNil)
}

const uploadProductImage = async (productId, file) => {
  const storage = getFirebaseStorage()
  if (!storage) throw new Error(i18n.t("firebase_not_configured"))
  const contentType = file.type || "image/jpeg"
  let ext = ".jpg"
  if (contentType === "image/png") ext = ".png"
  if (contentType === "image/webp") ext = ".webp"
  const storageRef = ref(storage, `images/${productId}${ext}`)
  await uploadBytes(storageRef, file, { contentType })
  return getDownloadURL(storageRef)
}

export const createProduct = async (values, imageFile) => {
  const createdBy = selectAuthUid()
  const db = getFirestoreDb()
  if (!db) throw new Error(i18n.t("firebase_not_configured"))
  if (!createdBy) throw new Error(i18n.t("sign_in_required"))
  if (!imageFile) throw new Error(i18n.t("image_is_required"))

  const id = uuidv7()
  const now = Date.now()
  const payload = formValuesToPayload(values)
  if (!payload.name) throw new Error(i18n.t("name_is_required"))
  const imageUrl = await uploadProductImage(id, imageFile)

  const raw = {
    _active: TRUE,
    id,
    createdBy,
    ...payload,
    imageUrl,
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

export const updateProduct = async (id, values, imageFile) => {
  const db = getFirestoreDb()
  if (!db) throw new Error(i18n.t("firebase_not_configured"))
  if (!id) throw new Error(i18n.t("product_id_required"))

  const payload = formValuesToPayload(values)
  if (!payload.name) throw new Error(i18n.t("name_is_required"))

  const patch = {
    ...payload,
    updatedAt: Date.now()
  }
  if (imageFile) {
    patch.imageUrl = await uploadProductImage(id, imageFile)
    patch["status.image"] = STEP_STATUS.PENDING
    patch["status.embedding"] = STEP_STATUS.PENDING
    patch["status.trellis"] = STEP_STATUS.PENDING
    patch["status.colada"] = STEP_STATUS.PENDING
    patch.trellisRequestId = deleteField()
    patch.hasGlb = deleteField()
    patch.hasBundle = deleteField()
    patch.modelGlbUrl = deleteField()
    patch.modelBundleUrl = deleteField()
  }
  await updateDoc(getDocRef("products", id), patch)
  if (imageFile) void wakeTicker()

  actions.update("products", (products = {}) => {
    const current = products[id] || { id }
    const next = {
      ...current,
      ...payload,
      price: parsePrice(payload.price),
      updatedAt: patch.updatedAt
    }
    if (imageFile) {
      next.imageUrl = patch.imageUrl
      next.status = {
        ...(current.status || {}),
        image: STEP_STATUS.PENDING,
        embedding: STEP_STATUS.PENDING,
        trellis: STEP_STATUS.PENDING,
        colada: STEP_STATUS.PENDING
      }
      next.hasGlb = false
      next.hasBundle = false
      next.glbUrl = null
      next.bundleUrl = null
      next.hasModel = false
      next.download_url = null
      delete next.trellisRequestId
    }
    return {
      ...products,
      [id]: toProductItem(next)
    }
  })
  showBanner("success", i18n.t("product_saved"))
  return selectProduct(id)
}

const patchProductDoc = async (id, firestorePatch, storePatch) => {
  const db = getFirestoreDb()
  if (!db) throw new Error(i18n.t("firebase_not_configured"))
  if (!id) throw new Error(i18n.t("product_id_required"))

  const updatedAt = Date.now()
  await updateDoc(getDocRef("products", id), { ...firestorePatch, updatedAt })
  actions.update("products", (products = {}) => {
    const current = products[id] || { id }
    return {
      ...products,
      [id]: toProductItem({
        ...current,
        ...storePatch,
        updatedAt
      })
    }
  })
  showBanner("success", i18n.t("product_saved"))
  return selectProduct(id)
}

export const updateProductColor = async (id, color) => {
  const value = (color || "").trim().toLowerCase()
  const firestorePatch = {}
  if (value) firestorePatch.color = value
  else firestorePatch.color = deleteField()
  return patchProductDoc(id, firestorePatch, { color: value || null })
}

export const updateProductDimensions = async (id, values) => {
  const parseDim = (raw) => {
    if (raw === "" || raw == null) return null
    const n = Number(raw)
    if (!Number.isFinite(n)) return null
    return n
  }
  const width = parseDim(values.width)
  const height = parseDim(values.height)
  const depth = parseDim(values.depth)
  const dimensions = _.omitBy({ width, height, depth }, _.isNil)
  const firestorePatch = {}
  if (_.isEmpty(dimensions)) firestorePatch.dimensions = deleteField()
  else firestorePatch.dimensions = dimensions
  let nextDimensions = dimensions
  if (_.isEmpty(dimensions)) nextDimensions = null
  return patchProductDoc(id, firestorePatch, { dimensions: nextDimensions })
}

export const updateProductTags = async (id, selectedTags) => {
  const tags = {}
  _.forEach(selectedTags || [], (tag) => {
    tags[tag] = TRUE
  })
  const firestorePatch = {}
  if (_.isEmpty(tags)) firestorePatch.tags = deleteField()
  else firestorePatch.tags = tags
  let nextTags = tags
  if (_.isEmpty(tags)) nextTags = null
  return patchProductDoc(id, firestorePatch, { tags: nextTags })
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
    const name = i18n.t("importing_from", { store: hostFromUrl(sourceUrl) })
    const raw = {
      _active: TRUE,
      id,
      name,
      source: PRODUCT_SOURCE.URL,
      sourceUrl,
      productUrl: sourceUrl,
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
