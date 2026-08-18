import { notifications } from "@mantine/notifications"
import i18n from "../i18n/index.js"

const COLOR_BY_TYPE = {
  warning: "orange",
  info: "blue",
  success: "green",
  error: "red"
}

export const showBanner = (type, message) => {
  if (type === "error") console.error(message)
  const typeKey = typeof type === "string" && type.length ? type : "info"
  notifications.show({
    color: COLOR_BY_TYPE[typeKey] || "blue",
    title: i18n.t(typeKey),
    message,
    autoClose: 3000
  })
}

export const clearBanner = () => notifications.clean()
export const selectBanner = () => ({})
