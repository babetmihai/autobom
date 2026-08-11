import { NavLink } from "react-router-dom"
import { useSelector } from "react-redux"
import { selectListItemCount } from "../lib/list.js"
import { cn } from "../lib/index.js"
import { ListIcon } from "./Icons.jsx"
import { isInSketchup } from "../lib/sketchup.js"

export default function ListLink() {
  const listCount = useSelector(() => selectListItemCount())
  if (!isInSketchup()) return null

  const listAriaLabel = listCount > 0 && `List, ${listCount} items`

  return (
    <NavLink
      to="/list"
      className={cn(
        "relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
        "text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-800"
      )}
      activeClassName="bg-brand/10 text-brand-dark"
      aria-label={listAriaLabel || "List"}
    >
      <ListIcon />
      {listCount > 0 &&
        <span
          className={cn(
            "absolute -right-0.5 -top-0.5 inline-flex min-h-[1.125rem] min-w-[1.125rem] items-center justify-center",
            "rounded-full bg-brand px-1 text-[0.625rem] font-bold leading-none tabular-nums text-white"
          )}
        >
          {listCount > 99 && "99+"}
          {listCount <= 99 && listCount}
        </span>
      }
    </NavLink>
  )
}
