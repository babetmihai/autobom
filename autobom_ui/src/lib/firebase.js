import { initializeApp } from "firebase/app"
import { getAuth } from "firebase/auth"
import { initializeFirestore, memoryLocalCache } from "firebase/firestore"
import { getStorage } from "firebase/storage"


const { VITE_APP_VERSION } = import.meta.env
const firebaseConfig = __FIREBASE_CONFIG__ || {}
const { apiKey, projectId } = firebaseConfig

let app = null
let dbInstance = undefined
let storageInstance = undefined
let authInstance = undefined

export const getFirestoreVersion = () => (VITE_APP_VERSION || "").trim()

export const getFirebaseApp = () => {
  if (app) return app
  const hasConfig = Boolean(apiKey && String(apiKey).trim() && projectId && String(projectId).trim())
  if (!hasConfig) {
    return null
  }
  app = initializeApp(firebaseConfig)
  return app
}

export const getFirebaseAuth = () => {
  if (authInstance !== undefined) return authInstance
  const firebaseApp = getFirebaseApp()
  if (!firebaseApp) {
    authInstance = null
    return null
  }
  authInstance = getAuth(firebaseApp)
  return authInstance
}

/** SketchUp HtmlDialog loads this UI from file:// — avoid crashing the whole bundle if init fails. */
export const getFirestoreDb = () => {
  if (dbInstance !== undefined) {
    return dbInstance
  }
  try {
    const firebaseApp = getFirebaseApp()
    if (!firebaseApp) {
      dbInstance = null
      return null
    }
    dbInstance = initializeFirestore(firebaseApp, {
      localCache: memoryLocalCache(),
      experimentalForceLongPolling: true
    })
    return dbInstance
  } catch (e) {
    console.error("[Autobom] Firebase init failed:", e)
    dbInstance = null
    return null
  }
}

export const getFirebaseStorage = () => {
  if (storageInstance !== undefined) return storageInstance
  const firebaseApp = getFirebaseApp()
  if (!firebaseApp) {
    storageInstance = null
    return null
  }
  storageInstance = getStorage(firebaseApp)
  return storageInstance
}
