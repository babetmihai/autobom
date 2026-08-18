import React from "react"
import { useSelector } from "react-redux"
import { ActionIcon, Button, Center, CloseButton, TextInput, Tooltip } from "@mantine/core"
import { IconBox, IconFileZip, IconPlus, IconRefresh, IconSearch } from "@tabler/icons-react"
import { AppShell } from "../components/AppShell.jsx"
import { AppHeader } from "../components/AppHeader"
import { actions } from "../lib/store/index.js"
import { useLoader } from "../lib/loaders.js"
import {
  fetchProducts,
  loadMoreProducts,
  selectCatalogProducts,
  selectProductsMeta,
  useImportListener,
  usePendingUrlImportListeners
} from "../lib/products.js"
import { useTagListener } from "../lib/tags.js"
import { selectListQuantities } from "../lib/list.js"
import { cn, materialCardClass } from "../lib/index.js"
import ModelCard from "../components/ModelCard.jsx"
import ProductUrlImport from "../components/ProductUrlImport.jsx"
import { showProductModal } from "../components/ProductModal.jsx"
import { glbNativeImport, isInSketchup, useSketchupEnvListener } from "../lib/sketchup.js"
import { useTranslation } from "react-i18next"
import _ from "lodash"

const skeletonCards = [0, 1, 2, 3, 4, 5]

const appActions = actions.create("app")

const catalogGridClass = "m-0 grid w-full list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"

export default function CatalogPage() {
  const { t } = useTranslation()
  const {
    searchQuery = "",
    hasGlb = false,
    hasBundle = false
  } = useSelector(() => appActions.get())

  const [sketchupEnv, setSketchupEnv] = React.useState(null)

  const list = useSelector(() => selectCatalogProducts())
  const { hasMore } = useSelector(() => selectProductsMeta())
  const listQuantities = useSelector(() => selectListQuantities())

  const inSketchup = isInSketchup()
  const glbSupported = !inSketchup || !sketchupEnv || glbNativeImport(sketchupEnv)

  const productFilters = {
    search: searchQuery,
    hasGlb,
    hasBundle
  }

  React.useEffect(() => {
    const delay = searchQuery.trim() ? 300 : 0
    const timer = setTimeout(() => {
      fetchProducts({ reset: true, ...productFilters })
    }, delay)
    return () => clearTimeout(timer)
  }, [searchQuery, hasGlb, hasBundle])

  useImportListener()
  usePendingUrlImportListeners()
  useTagListener()
  useSketchupEnvListener(setSketchupEnv)

  const hasFilters = Boolean(searchQuery.trim() || hasGlb || hasBundle)

  const loading = useLoader("loadProducts")
  const loadingMore = useLoader("loadMoreProducts")
  const listReady = !loading
  const listEmpty = _.isEmpty(list)
  const initialLoading = loading && listEmpty
  const showList = !listEmpty

  let bundleVariant = "subtle"
  let bundleColor = "gray"
  if (hasBundle) {
    bundleVariant = "light"
    bundleColor = "brand"
  }
  let glbVariant = "subtle"
  let glbColor = "gray"
  if (hasGlb) {
    glbVariant = "light"
    glbColor = "brand"
  }

  return (
    <AppShell header={<AppHeader />}>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5">
          <ProductUrlImport />
          <Tooltip label={t("new_product")}>
            <ActionIcon
              variant="subtle"
              color="brand"
              size="lg"
              radius="xl"
              aria-label={t("new_product")}
              onClick={() => showProductModal({
                onSubmit: () => {
                  appActions.set("hasGlb", false)
                  appActions.set("hasBundle", false)
                }
              })}
            >
              <IconPlus size={18} stroke={1.75} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label={t("refresh_models")}>
            <ActionIcon
              variant="subtle"
              color="gray"
              size="lg"
              radius="xl"
              aria-label={t("refresh_models")}
              disabled={loading}
              onClick={() => fetchProducts({ reset: true, ...productFilters })}
            >
              <IconRefresh size={18} stroke={1.75} />
            </ActionIcon>
          </Tooltip>
        </div>
        <TextInput
          className="min-w-[12rem] flex-1"
          placeholder={t("search_models")}
          value={searchQuery}
          onChange={(event) => appActions.set("searchQuery", event.currentTarget.value)}
          leftSection={<IconSearch size={18} stroke={1.75} />}
          rightSection={searchQuery &&
            <CloseButton
              aria-label={t("clear_search")}
              onClick={() => appActions.set("searchQuery", "")}
            />
          }
          rightSectionPointerEvents="all"
        />
        <div className="flex items-center gap-1.5">
          <Tooltip label={t("dae")}>
            <ActionIcon
              variant={bundleVariant}
              color={bundleColor}
              size="lg"
              radius="xl"
              aria-label={t("dae")}
              aria-pressed={hasBundle}
              onClick={() => appActions.set("hasBundle", !hasBundle)}
            >
              <IconFileZip size={18} stroke={1.75} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label={t("glb")}>
            <ActionIcon
              variant={glbVariant}
              color={glbColor}
              size="lg"
              radius="xl"
              aria-label={t("glb")}
              aria-pressed={hasGlb}
              onClick={() => appActions.set("hasGlb", !hasGlb)}
            >
              <IconBox size={18} stroke={1.75} />
            </ActionIcon>
          </Tooltip>
        </div>
      </div>
      {initialLoading &&
        <ul
          className={catalogGridClass}
          aria-hidden="true"
        >
          {skeletonCards.map((card) => (
            <li key={card} className="min-w-0">
              <div
                className={cn(
                  materialCardClass({ ready: true, padded: false }),
                  "flex h-full w-full flex-col overflow-hidden"
                )}
              >
                <div className="aspect-[4/3] w-full shrink-0 animate-pulse bg-gray-200" />
                <div className="flex flex-1 flex-col gap-2 px-4 py-3">
                  <div className="h-4 w-3/4 animate-pulse rounded bg-gray-200" />
                  <div className="h-3 w-1/2 animate-pulse rounded bg-gray-100" />
                </div>
              </div>
            </li>
          ))}
        </ul>
      }
      {showList &&
        <ul className={cn(catalogGridClass, loading && "opacity-60")}>
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
        <Center py="md">
          <Button
            variant="default"
            radius="xl"
            onClick={() => loadMoreProducts(productFilters)}
            loading={loadingMore}
          >
            {t("load_more")}
          </Button>
        </Center>
      }
      {listReady && listEmpty &&
        <div className={cn(materialCardClass({ ready: false }), "py-10 text-center")}>
          <p className="m-0 text-sm text-gray-500">
            {hasFilters && t("no_models_match_your_filters")}
            {!hasFilters && t("no_models_loaded_yet")}
          </p>
        </div>
      }
    </AppShell>
  )
}
