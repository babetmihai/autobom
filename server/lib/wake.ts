import { versionRef } from "./firebase"

const wakeRef = () => versionRef.collection("meta").doc("wake")

export const wake = async () => {
  await wakeRef().set({ at: Date.now() })
}

export const listenWake = (onWake: () => void) => {
  let ready = false
  return wakeRef().onSnapshot((snap) => {
    if (!ready) {
      ready = true
      return
    }
    if (!snap.exists) return
    onWake()
  })
}
