import React from "react"
import { Link, useLocation, useParams } from "react-router-dom"
import { useSelector } from "react-redux"
import { AppHeader } from "../components/AppHeader"
import { AppShell } from "../components/AppShell.jsx"
import {
  colorToHex,
  fetchProduct,
  formatDimensions,
  formatPrice,
  getActiveTags,
  isScrapePending,
  isUrlSource,
  resolveProductView,
  retryProduct,
  selectProduct,
  useImportListener,
  useProductListener
} from "../lib/products.js"
import { useTagListener } from "../lib/tags.js"
import { selectListQuantities } from "../lib/list.js"
import { useLoader } from "../lib/loaders.js"
import {
  ChevronLeftIcon,
  CubeIcon,
  LoadingSpinnerIcon,
  PencilIcon,
  RefreshIcon
} from "../components/Icons.jsx"
import ProductPageActions from "../components/ProductPageActions.jsx"
import { showProductModal } from "../components/ProductModal.jsx"
import { cn, PRODUCT_SOURCE, STEP_STATUS } from "../lib/index.js"
import { glbNativeImport, isInSketchup, useSketchupEnvListener } from "../lib/sketchup.js"

const tagChipClass = cn(
  "inline-flex max-w-full truncate rounded-full bg-neutral-100 px-2 py-0.5",
  "text-[0.6875rem] font-medium capitalize text-neutral-600"
)


export default function ProductPage() {
  const { productId } = useParams()
  const location = useLocation()
  const [sketchupEnv, setSketchupEnv] = React.useState(null)

  const product = useSelector(() => selectProduct(productId))
  const listQuantities = useSelector(() => selectListQuantities())
  const loading = useLoader(`product.${productId}`)

  const inSketchup = isInSketchup()
  const glbSupported = !inSketchup || !sketchupEnv || glbNativeImport(sketchupEnv)
  const backTo = location.state?.from || "/"
  const backLabel = location.state?.fromLabel || "Catalog"

  React.useEffect(() => {
    void fetchProduct(productId)
  }, [productId])

  useProductListener(productId)
  useImportListener()
  useTagListener()
  useSketchupEnvListener(setSketchupEnv)

  const view = resolveProductView(product)
  const priceDisplay = formatPrice(view?.price, view?.currency)
  const dimensionsDisplay = formatDimensions(view?.dimensions)
  const tags = getActiveTags(view?.tags)
  const colorHex = colorToHex(view?.color)
  const listCount = listQuantities[String(productId)] || 0
  const scrapePending = isScrapePending(view)
  const scrapeFailed = ((view && view.status) || {}).scrape === STEP_STATUS.FAILED
  const fromUrl = isUrlSource(view)
  const sourceLabel = (fromUrl && PRODUCT_SOURCE.URL) || (view && view.storeName)

  return (
    <AppShell header={<AppHeader />}>
      <Link to={backTo} className="ab-back-link mb-4">
        <ChevronLeftIcon />
        {backLabel}
      </Link>

      {loading && !product &&
        <div className="py-12 text-center text-neutral-600">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-neutral-200 border-t-brand" />
          <p className="m-0">Loading product...</p>
        </div>
      }

      {!loading && !product &&
        <div className="rounded-lg border border-dashed border-neutral-300 bg-white px-4 py-8 text-center">
          <p className="m-0 text-sm font-medium text-neutral-700">Product not found</p>
        </div>
      }

      {product &&
        <article className="overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
          <div className="flex flex-col lg:flex-row">
            <div className="relative aspect-[4/3] shrink-0 bg-neutral-100 lg:w-[min(100%,28rem)] lg:flex-1">
              {sourceLabel &&
                <span
                  className={cn(
                    "absolute left-3 top-3 z-10 max-w-[calc(100%-1.5rem)] truncate rounded-full",
                    "border border-white/70 bg-white/95 px-2 py-0.5 text-xs font-semibold text-neutral-700",
                    "shadow-[0_1px_4px_rgba(0,0,0,0.1)]"
                  )}
                  title={(view && view.sourceUrl) || (view && view.productUrl) || sourceLabel}
                >
                  {sourceLabel}
                </span>
              }
              {view.category &&
                <span
                  className={cn(
                    "absolute right-3 top-3 z-10 max-w-[calc(100%-1.5rem)] truncate rounded-full",
                    "border border-white/70 bg-white/95 px-2 py-0.5 text-xs font-semibold text-neutral-700",
                    "shadow-[0_1px_4px_rgba(0,0,0,0.1)]"
                  )}
                >
                  {view.category}
                </span>
              }
              {view.imageUrl &&
                <img
                  src={view.imageUrl}
                  alt={view.title || view.name || "Model"}
                  className="h-full w-full object-cover"
                />
              }
              {!view.imageUrl &&
                <div className="flex h-full w-full flex-col items-center justify-center gap-2 px-4 text-neutral-400">
                  {scrapePending &&
                    <LoadingSpinnerIcon className="h-8 w-8 animate-spin text-brand" />
                  }
                  {!scrapePending &&
                    <CubeIcon />
                  }
                  {scrapePending &&
                    <p className="m-0 text-center text-[0.75rem] text-neutral-500">
                      Scraping product page...
                    </p>
                  }
                  {scrapeFailed &&
                    <>
                      <p className="m-0 text-center text-[0.75rem] text-red-600">
                        Could not scrape this URL
                      </p>
                      <button
                        type="button"
                        className="ab-btn-toolbar text-neutral-700"
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
                </div>
              }
            </div>

            <div className="flex min-w-0 flex-1 flex-col p-4 sm:p-6">
              <div className="flex items-start gap-2">
                <h1 className="m-0 min-w-0 flex-1 text-xl font-semibold text-neutral-800">
                  {view.title || view.name || view.id}
                </h1>
                <button
                  type="button"
                  className="ab-btn-toolbar shrink-0"
                  title="Edit product"
                  onClick={() => showProductModal({ productId })}
                >
                  <PencilIcon className="h-4 w-4" />
                  Edit
                </button>
              </div>
              {fromUrl && view.sourceUrl &&
                <a
                  href={view.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="m-0 mt-1 truncate text-[0.75rem] text-neutral-400 hover:text-brand"
                >
                  {view.sourceUrl}
                </a>
              }
              {view.subtitle &&
                <p className="m-0 mt-1 text-sm text-neutral-500">{view.subtitle}</p>
              }
              {view.description &&
                <p className="m-0 mt-3 text-sm leading-relaxed text-neutral-600">{view.description}</p>
              }
              {view.sku &&
                <p className="m-0 mt-2 text-sm tabular-nums text-neutral-400">{view.sku}</p>
              }

              {(view.color || dimensionsDisplay) &&
                <div className="mt-4 flex flex-wrap items-center gap-2 border-b border-neutral-100 pb-4">
                  {view.color &&
                    <div className="flex min-w-0 items-center gap-2">
                      <span
                        className={cn(
                          "h-5 w-5 shrink-0 rounded-full border border-neutral-300",
                          !colorHex && "bg-neutral-200"
                        )}
                        style={colorHex ? { backgroundColor: colorHex } : undefined}
                        title={view.color}
                        aria-label={`Color: ${view.color}`}
                      />
                      <span className="truncate text-sm capitalize text-neutral-600">{view.color}</span>
                    </div>
                  }
                  {view.color && dimensionsDisplay &&
                    <span className="shrink-0 text-neutral-300" aria-hidden="true">·</span>
                  }
                  {dimensionsDisplay &&
                    <span className="text-sm tabular-nums text-neutral-500">{dimensionsDisplay}</span>
                  }
                </div>
              }

              {tags.length > 0 &&
                <div className="mt-4 flex flex-wrap items-center gap-1.5">
                  {tags.map((tag) => (
                    <span key={tag} className={tagChipClass} title={tag}>
                      {tag}
                    </span>
                  ))}
                </div>
              }

              {priceDisplay &&
                <div className="mt-4 text-lg font-bold text-brand">{priceDisplay}</div>
              }

              {inSketchup && listCount > 0 &&
                <p className="m-0 mt-3 text-sm font-medium text-green-800">
                  In list: {listCount}
                </p>
              }

              <ProductPageActions
                view={view}
                inSketchup={inSketchup}
                glbSupported={glbSupported}
                className="mt-6 border-t border-neutral-100 pt-4"
              />
            </div>
          </div>
        </article>
      }
    </AppShell>
  )
}
