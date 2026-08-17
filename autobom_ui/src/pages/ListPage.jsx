import React from "react"
import { Link } from "react-router-dom"
import { useSelector } from "react-redux"
import _ from "lodash"
import { Anchor, Button, Group, Loader, Paper, Text } from "@mantine/core"
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

  return (
    <AppShell
      header={
        <PageHeader
          title={t("list")}
          description={t("list_description")}
        />
      }
    >
      <Group mb="md" justify="flex-end">
        <Button
          variant="default"
          leftSection={<IconFileText size={16} stroke={1.75} />}
          onClick={() => exportBOM({ quantities: listQuantities, list: listForBom })}
          disabled={isEmpty}
        >
          {t("export_bom")}
        </Button>
      </Group>

      {isEmpty &&
        <Paper
          withBorder
          p="xl"
          radius="md"
          className="border-dashed text-center"
        >
          <Text fw={500} size="sm">{t("your_list_is_empty")}</Text>
          <Text size="sm" c="dimmed" mt="xs">
            {t("import_catalog_models_hint")}
          </Text>
        </Paper>
      }

      {!isEmpty &&
        <Paper withBorder radius="md" className="overflow-hidden shadow-sm">
          <ul className="m-0 list-none divide-y divide-gray-100 p-0">
            {lines.map(({ id, view, qty, lineTotal }) => {
              const { price, currency, imageUrl, name, sku } = view || {}
              const loading = loadingIds.includes(id)
              const priceDisplay = formatPrice(price, currency)
              const lineTotalDisplay = lineTotal != null
                ? formatPrice(lineTotal, currency)
                : null

              return (
                <li key={id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                  <div className="flex min-w-0 flex-1 gap-3">
                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-md bg-gray-100">
                      {imageUrl &&
                        <img src={imageUrl} alt="" className="h-full w-full object-cover" />
                      }
                      {!imageUrl &&
                        <div className="flex h-full w-full items-center justify-center text-xs text-gray-400">—</div>
                      }
                    </div>
                    <div className="min-w-0 flex-1">
                      {loading && !view &&
                        <Text size="sm" c="dimmed">{t("loading")}</Text>
                      }
                      {view &&
                        <>
                          <Anchor
                            component={Link}
                            to={{
                              pathname: `/product/${id}`,
                              state: { from: "/list", fromLabel: "list" }
                            }}
                            className="block truncate text-sm font-semibold text-gray-800"
                          >
                            {name || id}
                          </Anchor>
                          {sku &&
                            <Text
                              size="xs"
                              c="dimmed"
                              mt={2}
                              className="tabular-nums"
                            >{sku}</Text>
                          }
                          {priceDisplay &&
                            <Text
                              size="sm"
                              fw={500}
                              c="brand.5"
                              mt={4}
                            >{priceDisplay}</Text>
                          }
                        </>
                      }
                      {!view && !loading &&
                        <Text size="sm" className="truncate text-gray-600">{id}</Text>
                      }
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center justify-between gap-3 sm:justify-end">
                    <span className="min-w-[3rem] text-center text-sm font-semibold tabular-nums">{qty}</span>
                    {lineTotalDisplay &&
                      <span className="min-w-[5rem] text-right text-sm font-semibold tabular-nums text-gray-800">
                        {lineTotalDisplay}
                      </span>
                    }
                  </div>
                </li>
              )
            })}
          </ul>

          {hasPricedLines &&
            <div className="flex items-center justify-end gap-3 border-t border-gray-100 bg-gray-50 px-4 py-3">
              <Text size="sm" fw={500} c="dimmed">{t("grand_total")}</Text>
              <Text
                size="md"
                fw={700}
                c="brand.5"
                className="tabular-nums"
              >
                {formatPrice(grandTotal, lines.find(({ view }) => view?.currency)?.view?.currency)}
              </Text>
            </div>
          }
        </Paper>
      }

      {isLoading &&
        <Group gap="xs" mt="sm">
          <Loader size="sm" />
          <Text size="sm" c="dimmed">{t("loading_product_details")}</Text>
        </Group>
      }
    </AppShell>
  )
}
