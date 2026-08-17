import { useHistory } from "react-router-dom"
import { Badge, Button, Loader, Text } from "@mantine/core"
import { IconBox, IconRefresh } from "@tabler/icons-react"
import {
  colorToHex,
  formatDimensions,
  formatPrice,
  getProductPipelineView,
  getVisibleTags,
  isScrapePending,
  isUrlSource,
  resolveProductView,
  retryProduct
} from "../lib/products"
import ProductActions from "./ProductActions.jsx"
import { cn, STEP_STATUS } from "../lib/index.js"
import { useTranslation } from "react-i18next"

function ModelCard({
  model,
  listCount,
  glbSupported = true,
  inSketchup = true
}) {
  const { t } = useTranslation()
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
  const pipeline = getProductPipelineView(view)

  const openProduct = () => {
    const from = history.location.pathname
    const fromLabel = (from.startsWith("/scene-analyzer") && "scene") || "catalog"
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
        aria-label={t("open_product", { name: view.name || view.id })}
      >
        <div className="relative flex aspect-[4/3] shrink-0 items-center justify-center overflow-hidden bg-gray-100">
          <Badge
            className="absolute left-1.5 top-1.5 z-10 max-w-[calc(100%-0.75rem)]"
            variant="light"
            color={pipeline.color}
            size="sm"
          >
            {pipeline.label}
          </Badge>
          {view.imageUrl &&
            <img
              src={view.imageUrl}
              alt={view.name || t("model")}
              loading="lazy"
              className="h-full w-full object-contain object-center"
            />
          }
          {!view.imageUrl &&
            <div className="flex h-full w-full flex-col items-center justify-center gap-2 px-3 text-gray-400">
              {scrapePending &&
                <>
                  <Loader size="sm" color="brand" />
                  <Text size="xs" c="dimmed" ta="center">{t("scraping")}</Text>
                </>
              }
              {!scrapePending && scrapeFailed &&
                <>
                  <Text size="xs" c="red" ta="center">{t("scrape_failed")}</Text>
                  <Button
                    size="compact-xs"
                    variant="default"
                    leftSection={<IconRefresh size={14} stroke={1.75} />}
                    onClick={(event) => {
                      event.stopPropagation()
                      void retryProduct(view)
                    }}
                  >
                    {t("retry")}
                  </Button>
                </>
              }
              {!scrapePending && !scrapeFailed &&
                <IconBox size={48} stroke={1.5} />
              }
            </div>
          }
        </div>

        {hasMetaStrip &&
          <div className="flex min-h-[2.25rem] items-center gap-2 border-b border-gray-100 px-3 py-2">
            {hasColor &&
              <div className="flex min-w-0 items-center gap-1.5">
                <span
                  className={cn(
                    "h-5 w-5 shrink-0 rounded-full border border-gray-300",
                    !colorHex && "bg-gray-200"
                  )}
                  style={colorHex ? { backgroundColor: colorHex } : undefined}
                  title={view.color}
                  aria-label={t("color", { color: view.color })}
                />
                <span className="truncate text-xs capitalize text-gray-600">{view.color}</span>
              </div>
            }
            {hasColor && dimensionsDisplay &&
              <span className="shrink-0 text-gray-300" aria-hidden="true">·</span>
            }
            {dimensionsDisplay &&
              <span
                className="truncate text-xs tabular-nums text-gray-500"
                title={dimensionsDisplay}
              >
                {dimensionsDisplay}
              </span>
            }
          </div>
        }

        <div className="flex flex-1 flex-col p-3">
          <h3 className="mb-1 line-clamp-3 text-sm font-semibold leading-snug text-gray-800">
            {view.name || view.id}
          </h3>
          {fromUrl && view.sourceUrl &&
            <a
              href={view.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mb-1 truncate text-[0.6875rem] text-brand-500 hover:text-brand-600"
              title={view.sourceUrl}
              onClick={(event) => event.stopPropagation()}
            >
              {view.sourceUrl}
            </a>
          }
          {view.sku &&
            <p className="mb-1 text-xs tabular-nums text-gray-400">{view.sku}</p>
          }
          {hasTags &&
            <div className="mb-2 flex flex-wrap items-center gap-1">
              {visibleTags.map((tag) => (
                <Badge
                  key={tag}
                  size="xs"
                  variant="light"
                  color="gray"
                  title={tag}
                  className="max-w-full capitalize"
                >
                  {tag}
                </Badge>
              ))}
              {tagOverflow > 0 &&
                <span
                  className="text-[0.6875rem] font-medium text-gray-400"
                  title={t("more_tags", { count: tagOverflow })}
                >
                  +{tagOverflow}
                </span>
              }
            </div>
          }
          {priceDisplay &&
            <div className="mt-1 text-[0.9375rem] font-bold text-brand-500">{priceDisplay}</div>
          }
          {inSketchup && listCount > 0 &&
            <div className="mt-auto pt-2 text-xs text-gray-500">
              <span className="font-medium text-green-700">{t("in_list", { count: listCount })}</span>
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
