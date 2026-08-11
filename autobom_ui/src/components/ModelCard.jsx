import React from "react"
import { useHistory } from "react-router-dom"
import {
  colorToHex,
  formatDimensions,
  formatPrice,
  getVisibleTags,
  isScrapePending,
  isUrlSource,
  resolveProductView,
  retryProduct
} from "../lib/products"
import { CubeIcon, LoadingSpinnerIcon, RefreshIcon } from "./Icons"
import ProductActions from "./ProductActions.jsx"
import { cn, PRODUCT_SOURCE, STEP_STATUS } from "../lib/index.js"

const tagChipClass = cn(
  "inline-flex max-w-full truncate rounded-full bg-neutral-100 px-2 py-0.5",
  "text-[0.6875rem] font-medium capitalize text-neutral-600"
)

function ModelCard({
  model,
  listCount,
  glbSupported = true,
  inSketchup = true
}) {
  const view = resolveProductView(model)
  const priceDisplay = formatPrice(view.price, view.currency)
  const dimensionsDisplay = formatDimensions(view.dimensions)
  const { visible: visibleTags, overflow: tagOverflow } = getVisibleTags(view.tags)
  const colorHex = colorToHex(view.color)
  const hasColor = Boolean(view.color)
  const hasMetaStrip = hasColor || dimensionsDisplay
  const hasTags = visibleTags.length > 0
  const history = useHistory()
  const fromUrl = isUrlSource(view)
  const scrapePending = isScrapePending(view)
  const scrapeFailed = (view.status || {}).scrape === STEP_STATUS.FAILED
  const sourceLabel = (fromUrl && PRODUCT_SOURCE.URL) || view.storeName

  const openProduct = () => {
    const from = history.location.pathname
    const fromLabel = (from.startsWith("/scene-analyzer") && "Scene") || "Catalog"
    history.push({
      pathname: `/product/${view.id}`,
      state: { from, fromLabel }
    })
  }

  return (
    <li
      className={cn(
        "group flex min-w-[260px] max-w-full grow shrink basis-[260px] flex-col overflow-hidden rounded-lg bg-white",
        "shadow-[0_1px_3px_rgba(0,0,0,0.08)] sm:max-w-[calc((100%-1rem)/2)] lg:max-w-[calc((100%-2rem)/3)] xl:max-w-[calc((100%-3rem)/4)]",
        "transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(0,0,0,0.12)]"
      )}
    >
      <div
        className="flex min-h-0 flex-1 cursor-pointer flex-col"
        onClick={openProduct}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault()
            openProduct()
          }
        }}
        role="link"
        tabIndex={0}
        aria-label={`Open ${view.title || view.name || view.id}`}
      >
        <div className="relative aspect-[4/3] shrink-0 overflow-hidden bg-neutral-100">
          {sourceLabel &&
            <span
              className={cn(
                "absolute left-1.5 top-1.5 z-10 max-w-[calc(100%-0.75rem)] truncate rounded-full",
                "border border-white/70 bg-white/95 px-2 py-0.5 text-[0.6875rem] font-semibold text-neutral-700",
                "shadow-[0_1px_4px_rgba(0,0,0,0.1)] backdrop-blur-sm"
              )}
              title={view.sourceUrl || view.productUrl || sourceLabel}
            >
              {sourceLabel}
            </span>
          }
          {view.category &&
            <span
              className={cn(
                "absolute right-1.5 top-1.5 z-10 max-w-[calc(100%-0.75rem)] truncate rounded-full",
                "border border-white/70 bg-white/95 px-2 py-0.5 text-[0.6875rem] font-semibold text-neutral-700",
                "shadow-[0_1px_4px_rgba(0,0,0,0.1)] backdrop-blur-sm"
              )}
            >
              {view.category}
            </span>
          }
          {view.imageUrl &&
            <img
              src={view.imageUrl}
              alt={view.title || view.name || "Model"}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          }
          {!view.imageUrl &&
            <div className="flex h-full w-full flex-col items-center justify-center gap-2 px-3 text-neutral-400">
              {scrapePending &&
                <>
                  <LoadingSpinnerIcon className="h-6 w-6 animate-spin text-brand" />
                  <span className="text-center text-[0.75rem] text-neutral-500">Scraping...</span>
                </>
              }
              {!scrapePending && scrapeFailed &&
                <>
                  <span className="text-center text-[0.75rem] text-red-600">Scrape failed</span>
                  <button
                    type="button"
                    className={cn(
                      "inline-flex items-center gap-1 rounded border border-neutral-300 bg-white px-2 py-0.5",
                      "text-[0.75rem] font-semibold text-neutral-700 hover:bg-neutral-100"
                    )}
                    onClick={(event) => {
                      event.stopPropagation()
                      void retryProduct(view)
                    }}
                  >
                    <RefreshIcon />
                    Retry
                  </button>
                </>
              }
              {!scrapePending && !scrapeFailed &&
                <CubeIcon />
              }
            </div>
          }
        </div>

        {hasMetaStrip &&
          <div className="flex min-h-[2.25rem] items-center gap-2 border-b border-neutral-100 px-3 py-2">
            {hasColor &&
              <div className="flex min-w-0 items-center gap-1.5">
                <span
                  className={cn(
                    "h-5 w-5 shrink-0 rounded-full border border-neutral-300",
                    !colorHex && "bg-neutral-200"
                  )}
                  style={colorHex ? { backgroundColor: colorHex } : undefined}
                  title={view.color}
                  aria-label={`Color: ${view.color}`}
                />
                <span className="truncate text-xs capitalize text-neutral-600">{view.color}</span>
              </div>
            }
            {hasColor && dimensionsDisplay &&
              <span className="shrink-0 text-neutral-300" aria-hidden="true">·</span>
            }
            {dimensionsDisplay &&
              <span
                className="truncate text-xs tabular-nums text-neutral-500"
                title={dimensionsDisplay}
              >
                {dimensionsDisplay}
              </span>
            }
          </div>
        }

        <div className="flex flex-1 flex-col p-3">
          <h3
            className={cn(
              "line-clamp-3 leading-snug",
              "text-sm font-semibold text-neutral-800 mb-1",
              view.subtitle && "mb-0.5"
            )}
          >
            {view.title || view.name || view.id}
          </h3>
          {view.subtitle && (
            <p className="mb-1 line-clamp-2 text-xs leading-snug text-neutral-500">
              {view.subtitle}
            </p>
          )}
          {fromUrl && view.sourceUrl &&
            <p className="mb-1 truncate text-[0.6875rem] text-neutral-400" title={view.sourceUrl}>
              {view.sourceUrl}
            </p>
          }
          {view.sku &&
            <p className="mb-1 text-xs tabular-nums text-neutral-400">{view.sku}</p>
          }
          {hasTags &&
            <div className="mb-2 flex flex-wrap items-center gap-1">
              {visibleTags.map((tag) => (
                <span key={tag} className={tagChipClass} title={tag}>
                  {tag}
                </span>
              ))}
              {tagOverflow > 0 &&
                <span
                  className="text-[0.6875rem] font-medium text-neutral-400"
                  title={`${tagOverflow} more tags`}
                >
                  +{tagOverflow}
                </span>
              }
            </div>
          }
          {priceDisplay && (
            <div className="mt-1 text-[0.9375rem] font-bold text-brand">{priceDisplay}</div>
          )}
          {inSketchup && listCount > 0 &&
            <div className="mt-auto pt-2 text-xs text-neutral-500">
              <span className="font-medium text-green-800">In list: {listCount}</span>
            </div>
          }
        </div>
      </div>

      <ProductActions
        view={view}
        inSketchup={inSketchup}
        glbSupported={glbSupported}
      />
    </li>
  )
}

export default ModelCard
