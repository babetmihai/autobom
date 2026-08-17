import React from "react"
import { useSelector } from "react-redux"
import {
  ActionIcon,
  Button,
  Center,
  CloseButton,
  Group,
  Loader,
  Text,
  TextInput
} from "@mantine/core"
import { IconPlus, IconRefresh, IconSearch } from "@tabler/icons-react"
import { AppHeader } from "../components/AppHeader"
import { AppShell } from "../components/AppShell.jsx"
import { actions } from "../lib/store/index.js"
import { useLoader } from "../lib/loaders.js"
import {
  fetchProducts,
  loadMoreProducts,
  selectProducts,
  selectProductsMeta,
  useImportListener,
  usePendingUrlImportListeners
} from "../lib/products.js"
import { useTagListener } from "../lib/tags.js"
import { selectListQuantities } from "../lib/list.js"
import { cn } from "../lib/index.js"
import ModelCard from "../components/ModelCard.jsx"
import ProductUrlImport from "../components/ProductUrlImport.jsx"
import { showProductModal } from "../components/ProductModal.jsx"
import { glbNativeImport, isInSketchup, useSketchupEnvListener } from "../lib/sketchup.js"
import { useTranslation } from "react-i18next"
import _ from "lodash"

const skeletonCards = [0, 1, 2, 3, 4, 5]

const appActions = actions.create("app")

export default function CatalogPage() {
  const { t } = useTranslation()
  const {
    searchQuery = "",
    hasGlb = false,
    hasBundle = false
  } = useSelector(() => appActions.get())

  const [sketchupEnv, setSketchupEnv] = React.useState(null)

  const products = useSelector(() => selectProducts())
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

  const list = Object.values(products)
  const hasFilters = Boolean(searchQuery.trim() || hasGlb || hasBundle)

  const loading = useLoader("loadProducts")
  const loadingMore = useLoader("loadMoreProducts")
  const listReady = !loading
  const listEmpty = _.isEmpty(list)
  const initialLoading = loading && listEmpty
  const showList = !listEmpty

  return (
    <AppShell header={<AppHeader />}>
      <Group gap="xs" mb="md" wrap="nowrap">
        <TextInput
          className="grow"
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
          size="md"
        />
        <ActionIcon
          variant="default"
          size="input-md"
          aria-label={t("refresh_models")}
          onClick={() => fetchProducts({ reset: true, ...productFilters })}
          disabled={loading}
        >
          {loading && <Loader size={20} />}
          {!loading && <IconRefresh size={22} stroke={1.75} />}
        </ActionIcon>
      </Group>

      <Group gap="xs" mb="md" justify="space-between">
        <Group gap="xs">
          <Button
            variant="default"
            leftSection={<IconPlus size={16} stroke={1.75} />}
            onClick={() => showProductModal({
              onSubmit: () => {
                appActions.set("hasGlb", false)
                appActions.set("hasBundle", false)
              }
            })}
          >
            {t("new")}
          </Button>
          <ProductUrlImport />
        </Group>
        <Group gap="xs">
          <Button
            variant={hasBundle ? "light" : "default"}
            color={hasBundle ? "brand" : "gray"}
            onClick={() => appActions.set("hasBundle", !hasBundle)}
          >
            {t("dae")}
          </Button>
          <Button
            variant={hasGlb ? "light" : "default"}
            color={hasGlb ? "brand" : "gray"}
            onClick={() => appActions.set("hasGlb", !hasGlb)}
          >
            {t("glb")}
          </Button>
        </Group>
      </Group>

      {initialLoading &&
        <ul
          className="flex w-full list-none flex-wrap gap-4 p-0"
          aria-hidden="true"
        >
          {skeletonCards.map((card) => (
            <li
              key={card}
              className={cn(
                "flex min-w-[260px] max-w-full grow shrink basis-[260px] flex-col overflow-hidden rounded-lg",
                "border border-gray-200 bg-white animate-pulse",
                "sm:max-w-[calc((100%-1rem)/2)] lg:max-w-[calc((100%-2rem)/3)] xl:max-w-[calc((100%-3rem)/4)]"
              )}
            >
              <div className="aspect-[4/3] shrink-0 bg-gray-200" />
              <div className="flex flex-1 flex-col gap-2 p-3">
                <div className="h-4 w-3/4 rounded bg-gray-200" />
                <div className="h-3 w-1/2 rounded bg-gray-100" />
                <div className="mt-1 h-4 w-1/4 rounded bg-gray-200" />
              </div>
              <div className="h-11 border-t border-gray-100 bg-gray-50" />
            </li>
          ))}
        </ul>
      }
      {showList &&
        <ul className={cn("flex w-full list-none flex-wrap gap-4 p-0", loading && "opacity-60")}>
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
            onClick={() => loadMoreProducts(productFilters)}
            loading={loadingMore}
          >
            {t("load_more")}
          </Button>
        </Center>
      }
      {listReady && listEmpty && hasFilters &&
        <Text ta="center" c="dimmed" py="xl">
          {t("no_models_match_your_filters")}
        </Text>
      }
      {listReady && listEmpty && !hasFilters &&
        <Text ta="center" c="dimmed" py="xl">
          {t("no_models_loaded_yet")}
        </Text>
      }
    </AppShell>
  )
}
