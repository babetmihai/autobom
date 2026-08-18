import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut
} from "firebase/auth"
import { actions } from "./store/index.js"
import { getFirebaseAuth } from "./firebase.js"
import { setLoader, clearLoader } from "./loaders.js"
import { showBanner } from "./banner/index.js"
import i18n from "./i18n/index.js"


const authActions = actions.create("auth")

export const selectAuth = () => authActions.get()

export const selectAuthUid = () => authActions.get("uid", null)

export const selectAuthReady = () => authActions.get("ready", false)

export const selectAuthEmail = () => authActions.get("email", null)

const setAuthUser = (user) => {
  if (user) {
    authActions.set({
      uid: user.uid,
      email: user.email || null,
      ready: true
    })
    return
  }
  authActions.set({
    uid: null,
    email: null,
    ready: true
  })
}

export const initAuth = () => {
  authActions.update({ ready: false })
  const auth = getFirebaseAuth()
  if (!auth) {
    authActions.set({ uid: null, email: null, ready: true })
    return () => {}
  }
  return onAuthStateChanged(auth, (user) => {
    setAuthUser(user)
  })
}

export const signInWithEmail = async (email, password) => {
  const auth = getFirebaseAuth()
  if (!auth) {
    showBanner("error", i18n.t("firebase_not_configured"))
    return
  }

  setLoader("auth.signIn")
  try {
    await signInWithEmailAndPassword(auth, email.trim(), password)
  } catch (error) {
    console.error(error)
    showBanner("error", error.message || i18n.t("sign_in_failed"))
  } finally {
    clearLoader("auth.signIn")
  }
}

export const signUpWithEmail = async (email, password) => {
  const auth = getFirebaseAuth()
  if (!auth) {
    showBanner("error", i18n.t("firebase_not_configured"))
    return
  }

  setLoader("auth.signUp")
  try {
    await createUserWithEmailAndPassword(auth, email.trim(), password)
  } catch (error) {
    console.error(error)
    showBanner("error", error.message || i18n.t("sign_up_failed"))
  } finally {
    clearLoader("auth.signUp")
  }
}

export const signOut = async () => {
  const auth = getFirebaseAuth()
  if (!auth) return

  setLoader("auth.signOut")
  try {
    await firebaseSignOut(auth)
  } catch (error) {
    console.error(error)
    showBanner("error", error.message || i18n.t("sign_out_failed"))
  } finally {
    clearLoader("auth.signOut")
  }
}
