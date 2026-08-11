import { PlusIcon, LoadingSpinnerIcon } from "./Icons.jsx"
import { cn } from "../lib/index.js"

export default function InsertButton({ onClick, className, title = "Insert model", disabled, loading }) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      disabled={disabled || loading}
      className={cn(
        "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded",
        "border border-brand-dark bg-brand text-white transition-colors hover:bg-brand-dark",
        (disabled || loading) && "cursor-not-allowed opacity-55",
        className
      )}
      onClick={onClick}
    >
      {loading && <LoadingSpinnerIcon className="h-3.5 w-3.5" />}
      {!loading && <PlusIcon className="h-3.5 w-3.5" />}
    </button>
  )
}
