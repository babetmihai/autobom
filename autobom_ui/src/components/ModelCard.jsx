import { ActionIcon, Loader, Text, Tooltip } from "@mantine/core"
import { IconBox, IconFileZip, IconPlus, IconRefresh } from "@tabler/icons-react"
import { useHistory } from "react-router-dom"
import {
  addOrImportProduct,
  formatPrice,
  getProductPipelineView,
  importProductBundle,
  importProductGlb,
  isScrapePending,
  isUrlSource,
  resolveProductView,
  retryProduct
} from "../lib/products"
import { useLoader } from "../lib/loaders.js"
import { cn, materialCardClass, materialStatusTone, STEP_STATUS } from "../lib/index.js"
import { useTranslation } from "react-i18next"

export default function ModelCard({
  model,
  listCount,
  glbSupported = true,
  inSketchup = true
}) {
  const { t } = useTranslation()
  const history = useHistory()
  const view = resolveProductView(model)
  const {
    id: productId,
    name,
    imageUrl,
    sourceUrl,
    sku,
    price,
    currency,
    status,
    glbUrl,
    bundleUrl
  } = view || {}
  const priceDisplay = formatPrice(price, currency)
  const fromUrl = isUrlSource(view)
  const scrapePending = isScrapePending(view)
  const scrapeFailed = (status || {}).scrape === STEP_STATUS.FAILED
  const pipeline = getProductPipelineView(view)
  const { generating, failed, label: pipelineLabel } = pipeline || {}
  const { statusClass, dotClass } = materialStatusTone({
    ready: !generating && !failed,
    generating,
    failed
  })

  const importingGlb = useLoader(productId ? `importingModel.glb.${productId}` : "")
  const importingDae = useLoader(productId ? `importingModel.dae.${productId}` : "")
  const useGlbImport = inSketchup && Boolean(glbUrl) && glbSupported
  const useBundleImport = inSketchup && !useGlbImport && Boolean(bundleUrl)
  const glbBlocked = inSketchup && Boolean(glbUrl) && !glbSupported && !bundleUrl
  const canPrimary = useGlbImport || useBundleImport
  const importingPrimary = (useGlbImport && importingGlb) || (useBundleImport && importingDae)
  const importing = importingGlb || importingDae

  let insertTitle = t("no_importable_model")
  if (useGlbImport) insertTitle = t("insert_glb_model")
  if (useBundleImport) insertTitle = t("insert_collada_model")
  if (glbBlocked) insertTitle = t("glb_requires_sketchup_2025")

  const openProduct = () => {
    const from = history.location.pathname
    let fromLabel = "catalog"
    if (from.startsWith("/scene-analyzer")) fromLabel = "scene"
    history.push({
      pathname: `/product/${productId}`,
      state: { from, fromLabel }
    })
  }

  const stop = (event) => event.stopPropagation()

  return (
    <li className="min-w-0">
      <article
        className={cn(
          materialCardClass({
            ready: !generating && !failed,
            generating,
            failed,
            padded: false
          }),
          "flex h-full w-full cursor-pointer flex-col overflow-hidden"
        )}
        onClick={openProduct}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault()
            openProduct()
          }
        }}
        role="link"
        tabIndex={0}
        aria-label={t("open_product", { name: name || productId })}
      >
        <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden bg-gray-100">
          {imageUrl &&
            <img
              src={imageUrl}
              alt={name || t("model")}
              loading="lazy"
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
            <p className="m-0 line-clamp-2 min-h-[2.5rem] text-sm font-medium leading-5 text-gray-900">
              {name || productId}
            </p>
            <p className={cn("m-0 mt-0.5 flex items-center gap-1.5 text-xs leading-4", statusClass)}>
              <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", dotClass)} />
              <span className="truncate">{pipelineLabel}</span>
            </p>
            {fromUrl && sourceUrl &&
              <a
                href={sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1.5 block truncate text-xs text-brand-600 hover:text-brand-700"
                onClick={stop}
              >
                {sourceUrl}
              </a>
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
          <div className="flex shrink-0 items-center" onClick={stop} onKeyDown={stop}>
            {inSketchup &&
              <Tooltip label={insertTitle}>
                <span>
                  <ActionIcon
                    variant="subtle"
                    color="brand"
                    size="lg"
                    radius="xl"
                    aria-label={insertTitle}
                    disabled={!canPrimary || importing}
                    loading={importingPrimary}
                    onClick={() => void addOrImportProduct(view, { inSketchup, glbSupported })}
                  >
                    <IconPlus size={18} stroke={1.75} />
                  </ActionIcon>
                </span>
              </Tooltip>
            }
            {!inSketchup && glbUrl &&
              <Tooltip label={t("download_glb_model")}>
                <span>
                  <ActionIcon
                    variant="subtle"
                    color="brand"
                    size="lg"
                    radius="xl"
                    aria-label={t("download_glb_model")}
                    disabled={importing}
                    loading={importingGlb}
                    onClick={() => void importProductGlb(view)}
                  >
                    <IconBox size={18} stroke={1.75} />
                  </ActionIcon>
                </span>
              </Tooltip>
            }
            {!inSketchup && bundleUrl &&
              <Tooltip label={t("download_collada_bundle")}>
                <span>
                  <ActionIcon
                    variant="subtle"
                    color="brand"
                    size="lg"
                    radius="xl"
                    aria-label={t("download_collada_bundle")}
                    disabled={importing}
                    loading={importingDae}
                    onClick={() => void importProductBundle(view)}
                  >
                    <IconFileZip size={18} stroke={1.75} />
                  </ActionIcon>
                </span>
              </Tooltip>
            }
          </div>
        </div>
      </article>
    </li>
  )
}
