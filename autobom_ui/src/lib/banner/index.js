import { notifications } from "@mantine/notifications"

const COLOR_BY_TYPE = {
  warning: "orange",
  info: "blue",
  success: "green",
  error: "red"
}

export const showBanner = (type, message) => {
  const typeKey = typeof type === "string" && type.length ? type : "info"
  const title = typeKey.charAt(0).toUpperCase() + typeKey.slice(1)
  notifications.show({
    color: COLOR_BY_TYPE[typeKey] || "blue",
    title,
    message,
    autoClose: 3000
  })
}

export const clearBanner = () => notifications.clean()
export const selectBanner = () => ({})
