import React from "react"
import { useSelector } from "react-redux"
import { AppHeader } from "../components/AppHeader"
import { AppShell } from "../components/AppShell.jsx"
import { actions } from "../lib/store/index.js"
import { useLoader } from "../lib/loaders.js"
import {
  CATEGORIES,
  fetchProducts,
  loadMoreProducts,
  selectProducts,
  selectProductsMeta,
  useImportListener,
  usePendingUrlImportListeners
} from "../lib/products.js"
import { useTagListener } from "../lib/tags.js"
import { selectListQuantities } from "../lib/list.js"
import { LoadingSpinnerIcon, PlusIcon, RefreshIcon, SearchIcon } from "../components/Icons.jsx"
import { cn } from "../lib/index.js"
import ModelCard from "../components/ModelCard.jsx"
import ProductUrlImport from "../components/ProductUrlImport.jsx"
import { showProductModal } from "../components/ProductModal.jsx"
import { glbNativeImport, isInSketchup, useSketchupEnvListener } from "../lib/sketchup.js"
import _ from "lodash"

const categoryChipClass = cn(
  "rounded-full border border-neutral-200 bg-white px-3 py-1 font-[inherit] text-sm",
  "text-neutral-600 transition-[border-color,background-color,color] hover:bg-neutral-50"
)
const categoryChipActiveClass = "border-brand bg-brand/10 text-brand-dark"

const skeletonCards = [0, 1, 2, 3, 4, 5]

const appActions = actions.create("app")

export default function CatalogPage() {
  const {
    searchQuery = "",
    categoryId = "",
    hasGlb = true
  } = useSelector(() => appActions.get())

  const [sketchupEnv, setSketchupEnv] = React.useState(null)

  const products = useSelector(() => selectProducts())
  const { hasMore } = useSelector(() => selectProductsMeta())
  const listQuantities = useSelector(() => selectListQuantities())

  const inSketchup = isInSketchup()
  const glbSupported = !inSketchup || !sketchupEnv || glbNativeImport(sketchupEnv)

  const productFilters = {
    search: searchQuery,
    categoryId,
    hasGlb: glbSupported && hasGlb,
    hasBundle: !glbSupported && hasGlb
  }
  const modelFilterLabel = (glbSupported && "GLB") || "DAE"

  React.useEffect(() => {
    const delay = searchQuery.trim() ? 300 : 0
    const timer = setTimeout(() => {
      fetchProducts({ reset: true, ...productFilters })
    }, delay)
    return () => clearTimeout(timer)
  }, [searchQuery, categoryId, hasGlb, glbSupported])

  useImportListener()
  usePendingUrlImportListeners()
  useTagListener()
  useSketchupEnvListener(setSketchupEnv)

  const list = Object.values(products)
  const hasFilters = Boolean(searchQuery.trim() || categoryId || hasGlb)

  const loading = useLoader("loadProducts")
  const loadingMore = useLoader("loadMoreProducts")
  const listReady = !loading
  const listEmpty = _.isEmpty(list)
  const initialLoading = loading && listEmpty
  const showList = !listEmpty

  const setCategoryId = (id) => {
    appActions.set("categoryId", categoryId === id ? "" : id)
  }

  return (
    <AppShell header={<AppHeader />}>
      <div className="mb-4 flex flex-col gap-3">
        <div className="relative min-w-[12rem]">
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400">
            <SearchIcon />
          </span>
          <input
            type="text"
            className={cn(
              "w-full rounded-lg border border-neutral-200 bg-white py-2.5 pl-11 pr-4 font-[inherit]",
              "text-base outline-none transition-[border-color,box-shadow] placeholder:text-neutral-400",
              "focus:border-brand focus:ring-[3px] focus:ring-brand/15"
            )}
            placeholder="Search models..."
            value={searchQuery}
            onChange={(e) => appActions.set("searchQuery", e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={cn(categoryChipClass, !categoryId && categoryChipActiveClass)}
            onClick={() => appActions.set("categoryId", "")}
          >
            All
          </button>
          {Object.entries(CATEGORIES).map(([id, name]) => (
            <button
              key={id}
              type="button"
              className={cn(
                categoryChipClass,
                categoryId === id && categoryChipActiveClass
              )}
              onClick={() => setCategoryId(id)}
            >
              {name}
            </button>
          ))}
        </div>
      </div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="ab-btn-toolbar"
          onClick={() => fetchProducts({ reset: true, ...productFilters })}
          disabled={loading}
          aria-label="Refresh models"
        >
          {loading &&
            <LoadingSpinnerIcon className="h-4 w-4 animate-spin" />
          }
          {!loading &&
            <RefreshIcon />
          }
          Refresh
        </button>
        <button
          type="button"
          className={cn("ab-btn-toolbar", hasGlb && "border-brand bg-brand/10 text-brand-dark")}
          onClick={() => appActions.set("hasGlb", !hasGlb)}
        >
          {modelFilterLabel}
        </button>
        <button
          type="button"
          className="ab-btn-toolbar"
          onClick={() => showProductModal({
            onSubmit: () => appActions.set("hasGlb", false)
          })}
        >
          <PlusIcon className="h-4 w-4" />
          New
        </button>
        <ProductUrlImport />
      </div>

      {initialLoading &&
        <ul
          className="flex w-full list-none flex-wrap gap-4 p-0"
          aria-hidden="true"
        >
          {skeletonCards.map((card) => (
            <li
              key={card}
              className={cn(
                "flex min-w-[260px] max-w-full grow shrink basis-[260px] flex-col overflow-hidden rounded-lg",
                "border border-neutral-200 bg-white animate-pulse",
                "sm:max-w-[calc((100%-1rem)/2)] lg:max-w-[calc((100%-2rem)/3)] xl:max-w-[calc((100%-3rem)/4)]"
              )}
            >
              <div className="aspect-[4/3] shrink-0 bg-neutral-200" />
              <div className="flex flex-1 flex-col gap-2 p-3">
                <div className="h-4 w-3/4 rounded bg-neutral-200" />
                <div className="h-3 w-1/2 rounded bg-neutral-100" />
                <div className="mt-1 h-4 w-1/4 rounded bg-neutral-200" />
              </div>
              <div className="h-11 border-t border-neutral-100 bg-neutral-50" />
            </li>
          ))}
        </ul>
      }
      {showList &&
        <ul className={cn("flex w-full list-none flex-wrap gap-4 p-0", loading && "opacity-60")}>
          {list.map((product) => (
            <ModelCard
              key={product.id}
              model={product}
              listCount={listQuantities[String(product.id)] || 0}
              glbSupported={glbSupported}
              inSketchup={inSketchup}
            />
          ))}
        </ul>
      }
      {showList && hasMore &&
        <div className="flex justify-center py-4">
          <button
            type="button"
            className="ab-btn-toolbar"
            onClick={() => loadMoreProducts(productFilters)}
            disabled={loadingMore}
          >
            {loadingMore && "Loading..."}
            {!loadingMore && "Load more"}
          </button>
        </div>
      }
      {listReady && listEmpty && hasFilters &&
        <div className="py-8 text-center text-[0.9375rem] text-neutral-500">
          No models match your filters
        </div>
      }
      {listReady && listEmpty && !hasFilters &&
        <div className="py-8 text-center text-[0.9375rem] text-neutral-500">
          No models loaded yet...
        </div>
      }
    </AppShell>
  )
}
