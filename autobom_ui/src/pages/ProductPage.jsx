import React from "react"
import { Link, useHistory, useLocation, useParams } from "react-router-dom"
import { useSelector } from "react-redux"
import {
  ActionIcon,
  Anchor,
  Loader,
  Text
} from "@mantine/core"
import { IconBox, IconChevronLeft, IconRefresh } from "@tabler/icons-react"
import { AppHeader } from "../components/AppHeader"
import { AppShell } from "../components/AppShell.jsx"
import {
  deleteProduct,
  fetchProduct,
  formatPrice,
  getProductPipelineView,
  isScrapePending,
  isUrlSource,
  PRODUCT_MODEL_ASSET_KINDS,
  resolveProductView,
  retryProduct,
  selectProduct,
  useImportListener,
  useProductListener
} from "../lib/products.js"
import { useTagListener } from "../lib/tags.js"
import { selectListQuantities } from "../lib/list.js"
import { useLoader } from "../lib/loaders.js"
import AssetRow from "../components/AssetRow.jsx"
import ProductAnalysis from "../components/ProductAnalysis.jsx"
import ProductGroup from "../components/ProductGroup.jsx"
import ProductPageActions from "../components/ProductPageActions.jsx"
import { showBanner } from "../lib/banner/index.js"
import { cn, materialCardClass, materialStatusTone, STEP_STATUS } from "../lib/index.js"
import { glbNativeImport, isInSketchup, useSketchupEnvListener } from "../lib/sketchup.js"
import { useTranslation } from "react-i18next"
import _ from "lodash"


export default function ProductPage() {
  const { t } = useTranslation()
  const { productId } = useParams()
  const history = useHistory()
  const location = useLocation()
  const [sketchupEnv, setSketchupEnv] = React.useState(null)
  const [isDeleting, setIsDeleting] = React.useState(false)

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
  const {
    name,
    id: viewId,
    sourceUrl,
    description,
    sku,
    price,
    currency,
    imageUrl
  } = view || {}
  const priceDisplay = formatPrice(price, currency)
  const listCount = listQuantities[String(productId)] || 0
  const scrapePending = isScrapePending(view)
  const scrapeFailed = ((view && view.status) || {}).scrape === STEP_STATUS.FAILED
  const fromUrl = isUrlSource(view)
  const pipeline = getProductPipelineView(view)
  const { generating: pipelineGenerating, failed: pipelineFailed, label: pipelineLabel } = pipeline || {}
  const { statusClass, dotClass } = materialStatusTone({
    ready: !pipelineGenerating && !pipelineFailed,
    generating: pipelineGenerating,
    failed: pipelineFailed
  })

  const onDelete = async () => {
    if (!window.confirm(t("delete_this_product"))) return
    try {
      setIsDeleting(true)
      await deleteProduct(productId)
      history.push(from)
    } catch (error) {
      console.error(error)
      showBanner("error", error.message || t("could_not_delete_product"))
      setIsDeleting(false)
    }
  }

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
        <div className="flex flex-1 flex-col items-center justify-center py-12">
          <Loader color="brand" />
          <p className="m-0 mt-3 text-sm text-gray-500">{t("loading_product")}</p>
        </div>
      }

      {!loading && !product &&
        <div className={cn(materialCardClass({ ready: false }), "py-10 text-center")}>
          <p className="m-0 text-sm font-medium text-gray-700">{t("product_not_found")}</p>
        </div>
      }

      {product &&
        <div className="flex flex-col gap-4">
        <article
          className={cn(
            materialCardClass({
              ready: !pipelineGenerating && !pipelineFailed,
              generating: pipelineGenerating,
              failed: pipelineFailed,
              padded: false
            }),
            "overflow-hidden"
          )}
        >
          <div className="flex flex-col sm:flex-row">
            <div className="relative aspect-[4/3] shrink-0 bg-gray-100 sm:w-[16rem]">
              {imageUrl &&
                <img
                  src={imageUrl}
                  alt={name || t("model")}
                  className="h-full w-full object-contain"
                />
              }
              {!imageUrl &&
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
                      <ActionIcon
                        variant="subtle"
                        color="gray"
                        size="lg"
                        radius="xl"
                        aria-label={t("retry")}
                        onClick={(event) => {
                          event.stopPropagation()
                          void retryProduct(view)
                        }}
                      >
                        <IconRefresh size={18} stroke={1.75} />
                      </ActionIcon>
                    </>
                  }
                </div>
              }
            </div>

            <div className="flex min-w-0 flex-1 items-start gap-1 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="m-0 truncate text-sm font-medium text-gray-900">
                  {name || viewId}
                </p>
                <p className={cn("m-0 mt-0.5 flex items-center gap-1.5 text-xs leading-4", statusClass)}>
                  <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", dotClass)} />
                  <span className="truncate">{pipelineLabel}</span>
                </p>
                {fromUrl && sourceUrl &&
                  <Anchor
                    href={sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    size="xs"
                    c="brand"
                    className="mt-1.5 block truncate"
                  >
                    {sourceUrl}
                  </Anchor>
                }
                {description &&
                  <p className="m-0 mt-1.5 text-sm leading-relaxed text-gray-500">
                    {description}
                  </p>
                }
                {sku &&
                  <p className="m-0 mt-1 text-xs tabular-nums text-gray-400">{sku}</p>
                }
                {priceDisplay &&
                  <p className="m-0 mt-2 text-sm font-semibold text-brand-600">{priceDisplay}</p>
                }
                {inSketchup && listCount > 0 &&
                  <p className="m-0 mt-1 text-xs font-medium text-green-800">
                    {t("in_list", { count: listCount })}
                  </p>
                }
              </div>
              <ProductPageActions
                view={view}
                inSketchup={inSketchup}
                glbSupported={glbSupported}
                isDeleting={isDeleting}
                onDelete={onDelete}
              />
            </div>
          </div>
        </article>

        <ProductAnalysis product={view} />

        <ProductGroup title={t("assets")}>
          {_.map(PRODUCT_MODEL_ASSET_KINDS, (kind) => (
            <AssetRow
              key={kind}
              product={view}
              kind={kind}
              inSketchup={inSketchup}
              glbSupported={glbSupported}
              plain
            />
          ))}
        </ProductGroup>
        </div>
      }
    </AppShell>
  )
}
