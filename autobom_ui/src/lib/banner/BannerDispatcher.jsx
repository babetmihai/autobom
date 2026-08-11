import { useSelector } from "react-redux"
import { cn } from "../index.js"
import { clearBanner, selectBanner } from "./index.js"
import React from "react"


const TYPE_CLASSES = {
  warning: "border border-orange-300 bg-orange-50 text-orange-800",
  info: "border border-blue-300 bg-blue-50 text-blue-900",
  success: "border border-green-300 bg-green-50 text-green-800",
  error: "border border-red-300 bg-red-50 text-red-800"
}

function BannerDispatcher() {
  const { id, type, message } = useSelector(() => selectBanner())
  const tone = TYPE_CLASSES[type] ?? TYPE_CLASSES.info

  React.useEffect(() => {
    const t = setTimeout(() => clearBanner(), 3000)
    return () => clearTimeout(t)
  }, [id])

  if (!id) return null
  const typeKey = typeof type === "string" && type.length ? type : "info"
  const typeLabel = typeKey.charAt(0).toUpperCase() + typeKey.slice(1)

  return (
    <div
      className={cn(
        "fixed bottom-[0.75rem] right-[0.75rem] z-[200] flex min-w-[16rem] max-w-sm gap-[0.5rem]",
        "rounded-md px-[0.75rem] py-[0.5625rem] text-[0.875rem] shadow-md",
        tone
      )}
      role="status"
    >
      <span className="min-w-0 flex-1 leading-snug">
        <span className="font-bold">{typeLabel}: </span>
        {message}
      </span>
      <button
        type="button"
        onClick={() => clearBanner()}
        className={cn(
          "-m-[0.125rem] flex h-[1.4375rem] w-[1.4375rem] shrink-0 cursor-pointer",
          "items-center justify-center rounded text-[1.0625rem] leading-none opacity-70",
          "hover:bg-black/[0.08] hover:opacity-100"
        )}
        aria-label="Dismiss notification"
      >
        ×
      </button>
    </div>
  )
}

export default BannerDispatcher
