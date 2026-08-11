import BannerDispatcher from "../lib/banner/BannerDispatcher.jsx"

export function AppShell({ header, children }) {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-neutral-100 font-sans text-base leading-snug text-neutral-800">
      <div className="shrink-0">{header}</div>
      <main className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-4 sm:px-6 sm:py-6">
        {children}
      </main>
      <BannerDispatcher />
    </div>
  )
}
