import React from "react"
import { Link, useLocation, useParams } from "react-router-dom"
import { useSelector } from "react-redux"
import {
  Anchor,
  Badge,
  Button,
  Center,
  Loader,
  Paper,
  Text,
  Title
} from "@mantine/core"
import { IconBox, IconChevronLeft, IconPencil, IconRefresh } from "@tabler/icons-react"
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
import ProductPageActions from "../components/ProductPageActions.jsx"
import { showProductModal } from "../components/ProductModal.jsx"
import { cn, PRODUCT_SOURCE, STEP_STATUS } from "../lib/index.js"
import { glbNativeImport, isInSketchup, useSketchupEnvListener } from "../lib/sketchup.js"
import { useTranslation } from "react-i18next"


export default function ProductPage() {
  const { t } = useTranslation()
  const { productId } = useParams()
  const location = useLocation()
  const [sketchupEnv, setSketchupEnv] = React.useState(null)

  const product = useSelector(() => selectProduct(productId))
  const listQuantities = useSelector(() => selectListQuantities())
  const loading = useLoader(`product.${productId}`)

  const inSketchup = isInSketchup()
  const glbSupported = !inSketchup || !sketchupEnv || glbNativeImport(sketchupEnv)
  const { from = "/", fromLabel = "catalog" } = location.state || {}
  const backLabel = t(fromLabel)

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
      <Anchor
        component={Link}
        to={from}
        size="sm"
        mb="md"
        className="inline-flex items-center gap-1"
      >
        <IconChevronLeft size={16} stroke={1.75} />
        {backLabel}
      </Anchor>

      {loading && !product &&
        <Center py={48}>
          <div className="text-center">
            <Loader color="brand" mb="md" />
            <Text c="dimmed">{t("loading_product")}</Text>
          </div>
        </Center>
      }

      {!loading && !product &&
        <Paper
          withBorder
          p="xl"
          radius="md"
          className="border-dashed text-center"
        >
          <Text fw={500} size="sm">{t("product_not_found")}</Text>
        </Paper>
      }

      {product &&
        <Paper withBorder radius="md" className="overflow-hidden shadow-sm">
          <div className="flex flex-col lg:flex-row">
            <div className="relative aspect-[4/3] shrink-0 bg-gray-100 lg:w-[min(100%,28rem)] lg:flex-1">
              {sourceLabel &&
                <Badge
                  className="absolute left-3 top-3 z-10 max-w-[calc(100%-1.5rem)]"
                  variant="default"
                  title={(view && view.sourceUrl) || (view && view.productUrl) || sourceLabel}
                >
                  {sourceLabel}
                </Badge>
              }
              {view.category &&
                <Badge className="absolute right-3 top-3 z-10 max-w-[calc(100%-1.5rem)]" variant="default">
                  {view.category}
                </Badge>
              }
              {view.imageUrl &&
                <img
                  src={view.imageUrl}
                  alt={view.title || view.name || t("model")}
                  className="h-full w-full object-cover"
                />
              }
              {!view.imageUrl &&
                <div className="flex h-full w-full flex-col items-center justify-center gap-2 px-4 text-gray-400">
                  {scrapePending &&
                    <Loader color="brand" />
                  }
                  {!scrapePending &&
                    <IconBox size={48} stroke={1.5} />
                  }
                  {scrapePending &&
                    <Text size="xs" c="dimmed" ta="center">
                      {t("scraping_product_page")}
                    </Text>
                  }
                  {scrapeFailed &&
                    <>
                      <Text size="xs" c="red" ta="center">
                        {t("could_not_scrape_this_url")}
                      </Text>
                      <Button
                        variant="default"
                        size="compact-sm"
                        leftSection={<IconRefresh size={16} stroke={1.75} />}
                        onClick={(event) => {
                          event.stopPropagation()
                          void retryProduct(view)
                        }}
                      >
                        {t("retry")}
                      </Button>
                    </>
                  }
                </div>
              }
            </div>

            <div className="flex min-w-0 flex-1 flex-col p-4 sm:p-6">
              <div className="flex items-start gap-2">
                <Title order={2} className="m-0 min-w-0 flex-1 text-xl text-gray-800">
                  {view.title || view.name || view.id}
                </Title>
                <Button
                  variant="default"
                  size="compact-sm"
                  className="shrink-0"
                  leftSection={<IconPencil size={16} stroke={1.75} />}
                  onClick={() => showProductModal({ productId })}
                >
                  {t("edit")}
                </Button>
              </div>
              {fromUrl && view.sourceUrl &&
                <Anchor
                  href={view.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  size="xs"
                  c="dimmed"
                  className="mt-1 truncate"
                >
                  {view.sourceUrl}
                </Anchor>
              }
              {view.subtitle &&
                <Text size="sm" c="dimmed" mt={4}>{view.subtitle}</Text>
              }
              {view.description &&
                <Text
                  size="sm"
                  c="gray.6"
                  mt="sm"
                  className="leading-relaxed"
                >{view.description}</Text>
              }
              {view.sku &&
                <Text
                  size="sm"
                  c="dimmed"
                  mt="xs"
                  className="tabular-nums"
                >{view.sku}</Text>
              }

              {(view.color || dimensionsDisplay) &&
                <div className="mt-4 flex flex-wrap items-center gap-2 border-b border-gray-100 pb-4">
                  {view.color &&
                    <div className="flex min-w-0 items-center gap-2">
                      <span
                        className={cn(
                          "h-5 w-5 shrink-0 rounded-full border border-gray-300",
                          !colorHex && "bg-gray-200"
                        )}
                        style={colorHex ? { backgroundColor: colorHex } : undefined}
                        title={view.color}
                        aria-label={t("color", { color: view.color })}
                      />
                      <span className="truncate text-sm capitalize text-gray-600">{view.color}</span>
                    </div>
                  }
                  {view.color && dimensionsDisplay &&
                    <span className="shrink-0 text-gray-300" aria-hidden="true">·</span>
                  }
                  {dimensionsDisplay &&
                    <span className="text-sm tabular-nums text-gray-500">{dimensionsDisplay}</span>
                  }
                </div>
              }

              {tags.length > 0 &&
                <div className="mt-4 flex flex-wrap items-center gap-1.5">
                  {tags.map((tag) => (
                    <Badge
                      key={tag}
                      size="sm"
                      variant="light"
                      color="gray"
                      title={tag}
                      className="capitalize"
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              }

              {priceDisplay &&
                <Text
                  mt="md"
                  size="lg"
                  fw={700}
                  c="brand.5"
                >{priceDisplay}</Text>
              }

              {inSketchup && listCount > 0 &&
                <Text
                  mt="sm"
                  size="sm"
                  fw={500}
                  c="green.8"
                >
                  {t("in_list", { count: listCount })}
                </Text>
              }

              <ProductPageActions
                view={view}
                inSketchup={inSketchup}
                glbSupported={glbSupported}
                className="mt-6 border-t border-gray-100 pt-4"
              />
            </div>
          </div>
        </Paper>
      }
    </AppShell>
  )
}
