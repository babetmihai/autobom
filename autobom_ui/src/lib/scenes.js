import React from "react"
import _ from "lodash"
import { onSnapshot, setDoc, updateDoc } from "firebase/firestore"
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"
import { actions } from "./store/index.js"
import { createServices, getDocRef } from "./services.js"
import { getFirebaseStorage } from "./firebase.js"
import { setLoader, clearLoader } from "./loaders.js"
import { DEFAULT_SCENE_STATUS, EMPTY_ARRAY, FALSE, STEP_STATUS, TRUE } from "./index.js"
import { showBanner } from "./banner/index.js"
import { mapRawProduct } from "./products.js"
import { selectAuthUid } from "./auth.js"


const sceneService = createServices("scenes")
const productService = createServices("products")

const sceneActions = actions.create("scenes")
const sceneAppActions = actions.create("sceneApp")
const sceneMatchProductActions = actions.create("sceneMatchProducts")

const SCENES_PAGE_SIZE = 50

const defaultSceneName = (createdAt = Date.now()) => {
  const label = new Date(createdAt).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric"
  })
  return `Room scene · ${label}`
}

const nameFromFile = (file) => {
  const base = file.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim()
  if (!base) return null

  return base
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ")
}

const buildSceneName = (file, createdAt) => nameFromFile(file) || defaultSceneName(createdAt)

export const normalizeSceneStatus = (value) => {
  const { detection, matching } = value || {}
  return {
    detection: detection || STEP_STATUS.PENDING,
    matching: matching || STEP_STATUS.PENDING
  }
}

export const selectActiveSceneId = () => sceneAppActions.get("activeSceneId", "")

export const setActiveSceneId = (id) => sceneAppActions.set("activeSceneId", id || "")

export const selectActiveScene = () => {
  const sceneId = selectActiveSceneId()
  if (!sceneId) return null
  return sceneActions.get(sceneId, null)
}

export const selectSceneMatchProductsById = () => sceneMatchProductActions.get()

export const selectCropsWithMatches = () => {
  const scene = selectActiveScene()
  if (!scene?.crops?.length) return []

  const matchesByCrop = _.groupBy(scene.matches || [], "cropId")
  return scene.crops.map((crop) => ({
    crop,
    matches: matchesByCrop[crop.id] || []
  }))
}

export const selectScenesList = () => sceneAppActions.get("list", EMPTY_ARRAY)

export const selectScenesListMeta = () => sceneAppActions.get("listMeta", { lastId: null, hasMore: false })

const updateScenesListMeta = (rawScenes) => {
  const hasMore = rawScenes.length === SCENES_PAGE_SIZE
  const lastId = rawScenes.length ? rawScenes[rawScenes.length - 1].id : null
  sceneAppActions.set("listMeta", { lastId, hasMore })
}

export const fetchScenes = async ({ reset = true } = {}) => {
  const createdBy = selectAuthUid()
  if (!createdBy) return

  try {
    setLoader("scenes.list")

    const { lastId } = selectScenesListMeta()
    const rawScenes = await sceneService.list({
      pageSize: SCENES_PAGE_SIZE,
      lastId: reset ? undefined : lastId,
      createdBy
    })

    for (const scene of rawScenes) {
      sceneActions.set(scene.id, scene)
    }

    if (reset) {
      sceneAppActions.set("list", rawScenes)
    } else {
      sceneAppActions.update("list", (list = EMPTY_ARRAY) => [...list, ...rawScenes])
    }
    updateScenesListMeta(rawScenes)
  } catch (error) {
    showBanner("error", error.message)
  } finally {
    clearLoader("scenes.list")
  }
}

export const loadMoreScenes = async () => {
  const createdBy = selectAuthUid()
  const { lastId, hasMore } = selectScenesListMeta()
  if (!createdBy || !hasMore || !lastId) return

  try {
    setLoader("scenes.loadMore")
    const rawScenes = await sceneService.list({
      pageSize: SCENES_PAGE_SIZE,
      lastId,
      createdBy
    })

    for (const scene of rawScenes) {
      sceneActions.set(scene.id, scene)
    }

    sceneAppActions.update("list", (list = EMPTY_ARRAY) => [...list, ...rawScenes])
    updateScenesListMeta(rawScenes)
  } catch (error) {
    showBanner("error", error.message)
  } finally {
    clearLoader("scenes.loadMore")
  }
}

const hydrateMatches = async (matches = []) => {
  const productIds = _.uniq(matches.map((item) => item.productId).filter(Boolean))

  if (_.isEmpty(productIds)) return

  const products = await productService.list({ ids: productIds })

  for (const product of products) {
    const mapped = mapRawProduct(product)
    if (mapped) sceneMatchProductActions.set(mapped.id, mapped)
  }
}

export const uploadScene = async (file) => {
  const storage = getFirebaseStorage()
  const createdBy = selectAuthUid()
  if (!storage) {
    showBanner("error", "Firebase is not configured")
    return
  }
  if (!createdBy) {
    showBanner("error", "Sign in required")
    return
  }

  setLoader("scenes.upload")
  try {
    const buffer = await file.arrayBuffer()
    const digest = await crypto.subtle.digest("SHA-256", buffer)
    const contentHash = [...new Uint8Array(digest)]
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("")
    const id = contentHash

    const existing = await sceneService.get(id)
    if (existing) {
      sceneAppActions.set("activeSceneId", id)
      sceneActions.set(id, existing)
      if (existing.matches?.length) {
        await hydrateMatches(existing.matches)
      }
      showBanner("info", "This photo was already uploaded — opening existing scene")
      return id
    }

    const storageRef = ref(storage, `scenes/${id}.jpg`)
    let url
    try {
      url = await getDownloadURL(storageRef)
    } catch {
      await uploadBytes(storageRef, file, { contentType: file.type || "image/jpeg" })
      url = await getDownloadURL(storageRef)
    }

    const now = Date.now()
    const status = { ...DEFAULT_SCENE_STATUS }
    const name = buildSceneName(file, now)

    await setDoc(getDocRef("scenes", id), {
      _active: TRUE,
      id,
      contentHash,
      name,
      url,
      status,
      crops: [],
      matches: [],
      hasDetection: FALSE,
      hasMatching: FALSE,
      createdBy,
      createdAt: now,
      updatedAt: now
    })

    sceneAppActions.set("activeSceneId", id)
    sceneActions.set(id, {
      id,
      contentHash,
      name,
      url,
      status,
      crops: [],
      matches: [],
      createdBy
    })
    return id
  } catch (error) {
    showBanner("error", error.message || "Upload failed")
  } finally {
    clearLoader("scenes.upload")
  }
}

export const useSceneListener = (sceneId) => {
  React.useEffect(() => {
    if (!sceneId) return

    const docRef = getDocRef("scenes", sceneId)
    return onSnapshot(docRef, (snap) => {
      if (!snap.exists()) return
      const data = snap.data()
      const scene = _.omit(data, ["_search", "_active"])
      sceneActions.set(sceneId, scene)
      if (scene.matches?.length) {
        void hydrateMatches(scene.matches)
      }
    })
  }, [sceneId])
}

export const resolveSceneName = (scene) => {
  const trimmed = scene?.name?.trim()
  if (trimmed) return trimmed
  return defaultSceneName(scene?.createdAt)
}

export const updateSceneName = async (sceneId, name) => {
  const trimmed = name.trim()
  if (!sceneId || !trimmed) return

  const existing = sceneActions.get(sceneId, null)
  if (existing?.name?.trim() === trimmed) return

  setLoader(`scenes.rename.${sceneId}`)
  try {
    const updatedAt = Date.now()
    await updateDoc(getDocRef("scenes", sceneId), { name: trimmed, updatedAt })

    sceneActions.update(sceneId, (scene = {}) => ({ ...scene, name: trimmed, updatedAt }))
    sceneAppActions.update("list", (list = EMPTY_ARRAY) =>
      list.map((scene) => scene.id === sceneId ? { ...scene, name: trimmed, updatedAt } : scene)
    )
  } catch (error) {
    showBanner("error", error.message || "Could not rename scene")
  } finally {
    clearLoader(`scenes.rename.${sceneId}`)
  }
}

export const sceneStatusLabel = (status) => {
  const { detection, matching } = normalizeSceneStatus(status)

  if (detection === STEP_STATUS.FAILED || matching === STEP_STATUS.FAILED) {
    return "Analysis failed"
  }
  if (matching === STEP_STATUS.COMPLETED) return "Analysis complete"
  if (matching === STEP_STATUS.PROCESSING) return "Matching catalog items"
  if (detection === STEP_STATUS.PROCESSING) return "Detecting furniture"
  if (detection === STEP_STATUS.PENDING) return "Queued for analysis"
  return "Waiting"
}

export const sceneIsQueued = (status) => {
  const { detection, matching } = normalizeSceneStatus(status)
  return detection === STEP_STATUS.PENDING && matching === STEP_STATUS.PENDING
}

export const sceneIsProcessing = (status) => {
  const { detection, matching } = normalizeSceneStatus(status)
  return [detection, matching].some((step) => step === STEP_STATUS.PROCESSING)
}

export const sceneIsFailed = (status) => {
  const { detection, matching } = normalizeSceneStatus(status)
  return detection === STEP_STATUS.FAILED || matching === STEP_STATUS.FAILED
}

export const retryScene = async (scene) => {
  const { id, status } = scene || {}
  if (!id) return

  const { detection, matching } = normalizeSceneStatus(status)
  const patch = { updatedAt: Date.now() }
  const nextStatus = { detection, matching }

  if (detection === STEP_STATUS.FAILED) {
    patch["status.detection"] = STEP_STATUS.PENDING
    nextStatus.detection = STEP_STATUS.PENDING
  }
  if (matching === STEP_STATUS.FAILED) {
    patch["status.matching"] = STEP_STATUS.PENDING
    nextStatus.matching = STEP_STATUS.PENDING
  }

  if (!patch["status.detection"] && !patch["status.matching"]) return

  setLoader(`scenes.retry.${id}`)
  try {
    await updateDoc(getDocRef("scenes", id), patch)
    sceneActions.update(id, (current = {}) => ({
      ...current,
      status: nextStatus,
      updatedAt: patch.updatedAt
    }))
    sceneAppActions.update("list", (list = EMPTY_ARRAY) =>
      list.map((item) => item.id === id ? { ...item, status: nextStatus, updatedAt: patch.updatedAt } : item)
    )
  } catch (error) {
    showBanner("error", error.message || "Could not retry analysis")
  } finally {
    clearLoader(`scenes.retry.${id}`)
  }
}

export const sceneMatchingComplete = (status) =>
  normalizeSceneStatus(status).matching === STEP_STATUS.COMPLETED

export const sceneMatchingProcessing = (status) =>
  normalizeSceneStatus(status).matching === STEP_STATUS.PROCESSING

export const sceneStatusTone = (status) => {
  if (sceneIsFailed(status)) return "failed"
  if (sceneIsProcessing(status)) return "processing"
  if (sceneMatchingComplete(status)) return "complete"
  return "pending"
}

export const formatSceneRelativeDate = (timestamp) => {
  if (!timestamp) return null

  const diff = Date.now() - timestamp
  const minute = 60 * 1000
  const hour = 60 * minute
  const day = 24 * hour

  if (diff < minute) return "Just now"
  if (diff < hour) return `${Math.floor(diff / minute)}m ago`
  if (diff < day) return `${Math.floor(diff / hour)}h ago`
  if (diff < 7 * day) return `${Math.floor(diff / day)}d ago`

  return new Date(timestamp).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric"
  })
}
