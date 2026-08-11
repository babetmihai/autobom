import React from "react"
import { Link } from "react-router-dom"
import { useSelector } from "react-redux"
import _ from "lodash"
import { AppHeader } from "../components/AppHeader"
import { AppShell } from "../components/AppShell.jsx"
import { FileTextIcon, LoadingSpinnerIcon } from "../components/Icons.jsx"
import { selectListQuantities } from "../lib/list.js"
import { exportBOM } from "../lib/bom.js"
import {
  fetchProduct,
  formatPrice,
  resolveProductView,
  selectProduct,
  selectProducts
} from "../lib/products.js"
import { useTagListener } from "../lib/tags.js"

export default function ListPage() {
  const listQuantities = useSelector(() => selectListQuantities())
  const products = useSelector(() => selectProducts())

  useTagListener()

  const lineIds = React.useMemo(
    () => Object.keys(listQuantities).filter((id) => Number(listQuantities[id]) > 0),
    [listQuantities]
  )

  const [loadingIds, setLoadingIds] = React.useState([])

  React.useEffect(() => {
    let cancelled = false
    const missing = lineIds.filter((id) => !selectProduct(id))
    if (_.isEmpty(missing)) return

    setLoadingIds(missing)
    Promise.all(missing.map((id) => fetchProduct(id)))
      .finally(() => {
        if (!cancelled) setLoadingIds([])
      })

    return () => {
      cancelled = true
    }
  }, [lineIds.join("|")])

  const lines = lineIds.map((id) => {
    const product = products[id] || selectProduct(id)
    const qty = Number(listQuantities[id]) || 0
    const view = resolveProductView(product)
    const { price } = view || {}
    const unitPrice = price != null ? Number(price) : null
    const lineTotal = unitPrice != null ? unitPrice * qty : null
    return { id, product, view, qty, unitPrice, lineTotal }
  })

  const grandTotal = lines
    .map(({ lineTotal }) => lineTotal || 0)
    .reduce((sum, n) => sum + n, 0)

  const hasPricedLines = lines.some(({ unitPrice }) => unitPrice != null)
  const listForBom = lines.map(({ product }) => product).filter(Boolean)
  const isEmpty = lineIds.length === 0
  const isLoading = loadingIds.length > 0

  return (
    <AppShell header={<AppHeader />}>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <p className="m-0 flex-1 text-sm text-neutral-600">
          Quantities reflect models placed in your SketchUp file.
        </p>
        <button
          type="button"
          className="ab-btn-toolbar"
          onClick={() => exportBOM({ quantities: listQuantities, list: listForBom })}
          disabled={isEmpty}
        >
          <FileTextIcon /> Export BOM
        </button>
      </div>

      {isEmpty &&
        <div className="rounded-lg border border-dashed border-neutral-300 bg-white px-4 py-10 text-center">
          <p className="m-0 text-sm font-medium text-neutral-700">Your list is empty</p>
          <p className="m-0 mt-2 text-sm text-neutral-500">
            Import catalog models into SketchUp to add them here.
          </p>
        </div>
      }

      {!isEmpty &&
        <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
          <ul className="m-0 list-none divide-y divide-neutral-100 p-0">
            {lines.map(({ id, view, qty, lineTotal }) => {
              const { price, currency, imageUrl, title, name, sku } = view || {}
              const loading = loadingIds.includes(id)
              const priceDisplay = formatPrice(price, currency)
              const lineTotalDisplay = lineTotal != null
                ? formatPrice(lineTotal, currency)
                : null

              return (
                <li key={id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                  <div className="flex min-w-0 flex-1 gap-3">
                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-md bg-neutral-100">
                      {imageUrl &&
                        <img src={imageUrl} alt="" className="h-full w-full object-cover" />
                      }
                      {!imageUrl &&
                        <div className="flex h-full w-full items-center justify-center text-xs text-neutral-400">—</div>
                      }
                    </div>
                    <div className="min-w-0 flex-1">
                      {loading && !view &&
                        <p className="m-0 text-sm text-neutral-500">Loading…</p>
                      }
                      {view &&
                        <>
                          <Link
                            to={{
                              pathname: `/product/${id}`,
                              state: { from: "/list", fromLabel: "List" }
                            }}
                            className="block truncate text-sm font-semibold text-neutral-800 hover:text-brand-dark"
                          >
                            {title || name || id}
                          </Link>
                          {sku &&
                            <p className="m-0 mt-0.5 text-xs tabular-nums text-neutral-400">{sku}</p>
                          }
                          {priceDisplay &&
                            <p className="m-0 mt-1 text-sm font-medium text-brand">{priceDisplay}</p>
                          }
                        </>
                      }
                      {!view && !loading &&
                        <p className="m-0 truncate text-sm text-neutral-600">{id}</p>
                      }
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center justify-between gap-3 sm:justify-end">
                    <span className="min-w-[3rem] text-center text-sm font-semibold tabular-nums">{qty}</span>
                    {lineTotalDisplay &&
                      <span className="min-w-[5rem] text-right text-sm font-semibold tabular-nums text-neutral-800">
                        {lineTotalDisplay}
                      </span>
                    }
                  </div>
                </li>
              )
            })}
          </ul>

          {hasPricedLines &&
            <div className="flex items-center justify-end gap-3 border-t border-neutral-100 bg-neutral-50 px-4 py-3">
              <span className="text-sm font-medium text-neutral-600">Grand total</span>
              <span className="text-base font-bold tabular-nums text-brand">
                {formatPrice(grandTotal, lines.find(({ view }) => view?.currency)?.view?.currency)}
              </span>
            </div>
          }
        </div>
      }

      {isLoading &&
        <p className="mt-3 flex items-center gap-2 text-sm text-neutral-500">
          <LoadingSpinnerIcon className="h-4 w-4" />
          Loading product details…
        </p>
      }
    </AppShell>
  )
}
