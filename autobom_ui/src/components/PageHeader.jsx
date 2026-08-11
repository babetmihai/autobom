import { useSelector } from "react-redux"
import { AppNav } from "./AppNav.jsx"
import ListLink from "./ListLink.jsx"
import { selectAuthEmail, signOut } from "../lib/auth.js"
import { useLoader } from "../lib/loaders.js"

export function PageHeader({ title, description }) {
  const email = useSelector(() => selectAuthEmail())
  const signingOut = useLoader("auth.signOut")

  return (
    <header className="bg-white px-4 pt-4 sm:px-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="m-0 text-lg font-semibold text-neutral-800">{title}</h1>
          {description &&
            <p className="m-0 mt-1 text-sm text-neutral-600">{description}</p>
          }
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {email &&
            <span className="hidden max-w-[10rem] truncate text-xs text-neutral-500 sm:inline">
              {email}
            </span>
          }
          <button
            type="button"
            className="ab-btn-neutral py-[0.375rem] text-xs"
            disabled={signingOut}
            onClick={() => void signOut()}
          >
            Sign out
          </button>
          <ListLink />
        </div>
      </div>
      <div className="mt-3 border-b border-neutral-200">
        <AppNav />
      </div>
    </header>
  )
}
