import { EMPTY_OBJECT } from ".."
import { actions } from "../store/index.js"
import { v4 as uuidv4 } from "uuid"

export const selectBanner = () => actions.get("banner", EMPTY_OBJECT)
export const showBanner = (type, message) => actions.set("banner", { id: uuidv4(), type, message })
export const clearBanner = () => actions.unset("banner")
