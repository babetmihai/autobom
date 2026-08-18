import { cn, materialCardClass } from "../lib/index.js"

export default function ProductGroup({ title, actions, children }) {
  return (
    <section>
      <div className="mb-2 flex items-center gap-1 px-1">
        <h3 className="m-0 min-w-0 flex-1 text-xs font-medium uppercase tracking-wide text-gray-500">
          {title}
        </h3>
        {actions}
      </div>
      <div className={cn(materialCardClass({ ready: true, padded: false }), "overflow-hidden")}>
        <div className="divide-y divide-gray-100">
          {children}
        </div>
      </div>
    </section>
  )
}
