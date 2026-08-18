import React from "react"
import _ from "lodash"
import { onSnapshot, setDoc, updateDoc, deleteField } from "firebase/firestore"
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"
import { actions } from "./store/index.js"
import { createServices, getDocRef } from "./services.js"
import { getFirebaseStorage, getFirestoreDb, wakeTicker } from "./firebase.js"
import { setLoader, clearLoader } from "./loaders.js"
import { DEFAULT_SCENE_STATUS, EMPTY_ARRAY, FALSE, STEP_STATUS, TRUE } from "./index.js"
import { showBanner } from "./banner/index.js"
import { mapRawProduct } from "./products.js"
import { selectAuthUid } from "./auth.js"
import i18n from "./i18n/index.js"


const sceneService = createServices("scenes")
const productService = createServices("products")

const sceneActions = actions.create("scenes")
const sceneAppActions = actions.create("sceneApp")
const sceneMatchProductActions = actions.create("sceneMatchProducts")

const SCENES_PAGE_SIZE = 50

const defaultSceneName = (createdAt = Date.now()) => {
  const label = new Date(createdAt).toLocaleDateString(i18n.language, {
    month: "short",
    day: "numeric",
    year: "numeric"
  })
  return i18n.t("room_scene", { date: label })
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
  return { detection, matching }
}

export const selectActiveSceneId = () => sceneAppActions.get("activeSceneId", "")

export const setActiveSceneId = (id) => sceneAppActions.set("activeSceneId", id || "")

export const selectActiveScene = () => {
  const sceneId = selectActiveSceneId()
  if (!sceneId) return null
  return sceneActions.get(sceneId, null)
}

export const selectScene = (id) => {
  if (!id) return null
  return sceneActions.get(id, null)
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
      createdBy,
      orderByField: "createdAt"
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
    console.error(error)
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
      createdBy,
      orderByField: "createdAt"
    })

    for (const scene of rawScenes) {
      sceneActions.set(scene.id, scene)
    }

    sceneAppActions.update("list", (list = EMPTY_ARRAY) => [...list, ...rawScenes])
    updateScenesListMeta(rawScenes)
  } catch (error) {
    console.error(error)
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
    showBanner("error", i18n.t("firebase_not_configured"))
    return
  }
  if (!createdBy) {
    showBanner("error", i18n.t("sign_in_required"))
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

    let existing = null
    try {
      existing = await sceneService.get(id)
    } catch (error) {
      if (error.code !== "permission-denied") throw error
    }
    if (existing) {
      sceneAppActions.set("activeSceneId", id)
      sceneActions.set(id, existing)
      if (existing.matches?.length) {
        await hydrateMatches(existing.matches)
      }
      showBanner("info", i18n.t("photo_already_uploaded"))
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
    void wakeTicker()

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
    console.error(error)
    showBanner("error", error.message || i18n.t("upload_failed"))
  } finally {
    clearLoader("scenes.upload")
  }
}

export const useSceneListener = (sceneId) => {
  React.useEffect(() => {
    if (!sceneId) return

    const docRef = getDocRef("scenes", sceneId)
    return onSnapshot(docRef, (snap) => {
      if (!snap.exists()) {
        sceneActions.unset(sceneId)
        return
      }
      const data = snap.data()
      if (data._active !== TRUE) {
        sceneActions.unset(sceneId)
        return
      }
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
    console.error(error)
    showBanner("error", error.message || i18n.t("could_not_rename_scene"))
    throw error
  } finally {
    clearLoader(`scenes.rename.${sceneId}`)
  }
}

export const deleteScene = async (id) => {
  const db = getFirestoreDb()
  if (!db) throw new Error(i18n.t("firebase_not_configured"))
  if (!id) throw new Error(i18n.t("scene_id_required"))

  setLoader(`scenes.delete.${id}`)
  try {
    await updateDoc(getDocRef("scenes", id), {
      _active: deleteField(),
      updatedAt: Date.now()
    })
    sceneActions.unset(id)
    sceneAppActions.update("list", (list = EMPTY_ARRAY) =>
      list.filter((scene) => scene.id !== id)
    )
    if (selectActiveSceneId() === id) setActiveSceneId("")
    showBanner("success", i18n.t("scene_deleted"))
  } finally {
    clearLoader(`scenes.delete.${id}`)
  }
}

export const sceneStatusLabel = (status) => {
  const { detection, matching } = status || {}

  if (detection === STEP_STATUS.FAILED) return i18n.t("analysis_failed")
  if (detection === STEP_STATUS.PROCESSING) return i18n.t("detecting_furniture")
  if (detection === STEP_STATUS.PENDING) return i18n.t("queued_for_analysis")
  if (matching === STEP_STATUS.PROCESSING) return i18n.t("matching_catalog_items")
  if (matching === STEP_STATUS.PENDING) return i18n.t("matching_catalog_items")
  if (detection === STEP_STATUS.COMPLETED) return i18n.t("detection_complete")
  return i18n.t("not_generated")
}

export const sceneIsQueued = (status) => {
  const { detection, matching } = status || {}
  return detection === STEP_STATUS.PENDING || matching === STEP_STATUS.PENDING
}

export const sceneIsProcessing = (status) => {
  const { detection, matching } = status || {}
  return [detection, matching].some((step) => {
    return step === STEP_STATUS.PENDING || step === STEP_STATUS.PROCESSING
  })
}

export const sceneIsFailed = (status) => {
  const { detection } = status || {}
  return detection === STEP_STATUS.FAILED
}

export const requestSceneStep = async (scene, kind) => {
  const { id } = scene || {}
  if (!id) return
  if (kind !== "detection") return

  const updatedAt = Date.now()
  const nextStatus = { detection: STEP_STATUS.PENDING }
  const patch = {
    updatedAt,
    "status.detection": STEP_STATUS.PENDING,
    "status.matching": deleteField(),
    crops: [],
    matches: [],
    hasDetection: FALSE,
    hasMatching: FALSE
  }

  const loaderPath = `scenes.step.detection.${id}`
  setLoader(loaderPath)
  try {
    await updateDoc(getDocRef("scenes", id), patch)
    void wakeTicker()
    sceneActions.update(id, (current = {}) => ({
      ...current,
      status: nextStatus,
      crops: [],
      matches: [],
      updatedAt
    }))
    sceneAppActions.update("list", (list = EMPTY_ARRAY) =>
      list.map((item) => {
        if (item.id !== id) return item
        return { ...item, status: nextStatus, crops: [], matches: [], updatedAt }
      })
    )
  } catch (error) {
    console.error(error)
    showBanner("error", error.message || i18n.t("could_not_retry_analysis"))
  } finally {
    clearLoader(loaderPath)
  }
}

export const deleteCrop = async (scene, cropId) => {
  const { id, crops, matches, status } = scene || {}
  if (!id || !cropId) return

  const cropList = crops || []
  const crop = _.find(cropList, { id: cropId })
  if (!crop) return

  const updatedAt = Date.now()
  const nextCrops = _.filter(cropList, (item) => item.id !== cropId)
  const nextMatches = _.filter(matches || [], (item) => item.cropId !== cropId)
  const matchingBusy = _.some(nextCrops, (item) => {
    const step = item.status
    return step === STEP_STATUS.PENDING || step === STEP_STATUS.PROCESSING
  })
  const matchingDone = _.some(nextCrops, (item) => item.status === STEP_STATUS.COMPLETED)
  const nextStatus = { ...(status || {}) }
  const hasMatching = matchingDone ? TRUE : FALSE
  const patch = {
    updatedAt,
    crops: nextCrops,
    matches: nextMatches,
    hasMatching
  }

  if (!matchingBusy) {
    if (matchingDone) {
      patch["status.matching"] = STEP_STATUS.COMPLETED
      nextStatus.matching = STEP_STATUS.COMPLETED
    } else {
      patch["status.matching"] = deleteField()
      delete nextStatus.matching
    }
  }

  const loaderPath = `scenes.crop.delete.${id}.${cropId}`
  setLoader(loaderPath)
  try {
    await updateDoc(getDocRef("scenes", id), patch)
    sceneActions.update(id, (current = {}) => ({
      ...current,
      status: nextStatus,
      crops: nextCrops,
      matches: nextMatches,
      hasMatching,
      updatedAt
    }))
    sceneAppActions.update("list", (list = EMPTY_ARRAY) =>
      list.map((item) => {
        if (item.id !== id) return item
        return { ...item, status: nextStatus, crops: nextCrops, matches: nextMatches, updatedAt }
      })
    )
    showBanner("success", i18n.t("crop_deleted"))
  } catch (error) {
    console.error(error)
    showBanner("error", error.message || i18n.t("could_not_delete_crop"))
  } finally {
    clearLoader(loaderPath)
  }
}

export const requestCropMatch = async (scene, cropId) => {
  const { id, crops, matches, status } = scene || {}
  if (!id || !cropId) return

  const cropList = crops || []
  const crop = _.find(cropList, { id: cropId })
  if (!crop) return

  const updatedAt = Date.now()
  const nextCrops = _.map(cropList, (item) => {
    if (item.id !== cropId) return item
    return { ...item, status: STEP_STATUS.PENDING }
  })
  const nextMatches = _.filter(matches || [], (item) => item.cropId !== cropId)
  const nextStatus = {
    ...(status || {}),
    matching: STEP_STATUS.PENDING
  }
  const patch = {
    updatedAt,
    crops: nextCrops,
    matches: nextMatches,
    "status.matching": STEP_STATUS.PENDING
  }

  const loaderPath = `scenes.crop.${id}.${cropId}`
  setLoader(loaderPath)
  try {
    await updateDoc(getDocRef("scenes", id), patch)
    void wakeTicker()
    sceneActions.update(id, (current = {}) => ({
      ...current,
      status: nextStatus,
      crops: nextCrops,
      matches: nextMatches,
      updatedAt
    }))
    sceneAppActions.update("list", (list = EMPTY_ARRAY) =>
      list.map((item) => {
        if (item.id !== id) return item
        return { ...item, status: nextStatus, crops: nextCrops, matches: nextMatches, updatedAt }
      })
    )
  } catch (error) {
    console.error(error)
    showBanner("error", error.message || i18n.t("could_not_retry_analysis"))
  } finally {
    clearLoader(loaderPath)
  }
}

export const retryScene = async (scene) => {
  await requestSceneStep(scene, "detection")
}

export const cropMatchingStatus = (crop) => (crop || {}).status || null

export const sceneStatusTone = (status) => {
  if (sceneIsFailed(status)) return "failed"
  if (sceneIsProcessing(status)) return "processing"
  const { detection } = status || {}
  if (detection === STEP_STATUS.COMPLETED) return "complete"
  return "pending"
}

export const formatSceneRelativeDate = (timestamp) => {
  if (!timestamp) return null

  const diff = Date.now() - timestamp
  const minute = 60 * 1000
  const hour = 60 * minute
  const day = 24 * hour

  if (diff < minute) return i18n.t("just_now")
  if (diff < hour) return i18n.t("minutes_ago", { count: Math.floor(diff / minute) })
  if (diff < day) return i18n.t("hours_ago", { count: Math.floor(diff / hour) })
  if (diff < 7 * day) return i18n.t("days_ago", { count: Math.floor(diff / day) })

  return new Date(timestamp).toLocaleDateString(i18n.language, {
    month: "short",
    day: "numeric",
    year: "numeric"
  })
}
