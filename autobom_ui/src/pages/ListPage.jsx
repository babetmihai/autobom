import React from "react"
import { Link } from "react-router-dom"
import { useSelector } from "react-redux"
import _ from "lodash"
import { ActionIcon, Tooltip } from "@mantine/core"
import { IconFileText } from "@tabler/icons-react"
import { AppShell, PageHeader } from "../components/AppShell.jsx"
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
import { cn, materialCardClass } from "../lib/index.js"
import { useTranslation } from "react-i18next"

export default function ListPage() {
  const { t } = useTranslation()
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
  const pricedLine = _.find(lines, ({ view }) => (view || {}).currency)
  const { currency: totalCurrency } = (pricedLine && pricedLine.view) || {}

  return (
    <AppShell
      header={
        <PageHeader
          title={t("list")}
          description={t("list_description")}
        />
      }
    >
      <div className="mb-4 flex justify-end">
        <Tooltip label={t("export_bom")}>
          <span>
            <ActionIcon
              variant="subtle"
              color="gray"
              size="lg"
              radius="xl"
              aria-label={t("export_bom")}
              disabled={isEmpty}
              onClick={() => exportBOM({ quantities: listQuantities, list: listForBom })}
            >
              <IconFileText size={18} stroke={1.75} />
            </ActionIcon>
          </span>
        </Tooltip>
      </div>
      {isEmpty &&
        <div className={cn(materialCardClass({ ready: false }), "py-10 text-center")}>
          <p className="m-0 text-sm font-medium text-gray-700">{t("your_list_is_empty")}</p>
          <p className="m-0 mt-1 text-xs text-gray-500">{t("import_catalog_models_hint")}</p>
        </div>
      }

      {!isEmpty &&
        <div className={cn(materialCardClass({ ready: true, padded: false }), "overflow-hidden")}>
          <div className="divide-y divide-gray-100">
          {lines.map(({ id, view, qty, lineTotal }) => {
            const { price, currency, imageUrl, name, sku } = view || {}
            const loading = _.includes(loadingIds, id)
            const priceDisplay = formatPrice(price, currency)
            const lineTotalDisplay = lineTotal != null
              ? formatPrice(lineTotal, currency)
              : null

            return (
              <article key={id} className="flex items-center gap-3 px-4 py-3">
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                  {imageUrl &&
                    <img src={imageUrl} alt="" className="h-full w-full object-contain" />
                  }
                </div>
                <div className="min-w-0 flex-1">
                  {loading && !view &&
                    <p className="m-0 text-sm text-gray-500">{t("loading")}</p>
                  }
                  {view &&
                    <>
                      <Link
                        to={{
                          pathname: `/product/${id}`,
                          state: { from: "/list", fromLabel: "list" }
                        }}
                        className="block truncate text-sm font-medium text-gray-900"
                      >
                        {name || id}
                      </Link>
                      {sku &&
                        <p className="m-0 mt-0.5 text-xs tabular-nums text-gray-400">{sku}</p>
                      }
                      {priceDisplay &&
                        <p className="m-0 mt-1 text-sm font-semibold text-brand-600">{priceDisplay}</p>
                      }
                    </>
                  }
                  {!view && !loading &&
                    <p className="m-0 truncate text-sm text-gray-600">{id}</p>
                  }
                </div>
                <div className="flex shrink-0 flex-col items-end gap-0.5">
                  <span className="text-sm font-medium tabular-nums text-gray-900">{qty}</span>
                  {lineTotalDisplay &&
                    <span className="text-xs font-semibold tabular-nums text-brand-600">
                      {lineTotalDisplay}
                    </span>
                  }
                </div>
              </article>
            )
          })}
          {hasPricedLines &&
            <div className="flex items-center justify-end gap-3 bg-gray-50 px-4 py-3">
              <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
                {t("grand_total")}
              </span>
              <span className="text-sm font-semibold tabular-nums text-brand-600">
                {formatPrice(grandTotal, totalCurrency)}
              </span>
            </div>
          }
          </div>
        </div>
      }

      {isLoading &&
        <p className="m-0 mt-3 text-xs text-gray-500">{t("loading_product_details")}</p>
      }
    </AppShell>
  )
}
