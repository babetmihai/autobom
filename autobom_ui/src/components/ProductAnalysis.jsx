import { Badge } from "@mantine/core"
import { IconPalette, IconRuler2, IconTags } from "@tabler/icons-react"
import { getProductAnalysisView } from "../lib/products.js"
import ProductAnalysisField from "./ProductAnalysisField.jsx"
import ProductGroup from "./ProductGroup.jsx"
import {
  showProductColorModal,
  showProductDimensionsModal,
  showProductTagsModal
} from "./ProductFieldModals.jsx"
import { cn } from "../lib/index.js"
import { useTranslation } from "react-i18next"

export default function ProductAnalysis({ product }) {
  const { t } = useTranslation()
  const analysis = getProductAnalysisView(product)
  const { color, dimensions, tags, failed: analysisFailed } = analysis || {}
  const {
    value: colorName,
    hex: colorHex,
    hasValue: hasColor,
    generating: colorGenerating,
    statusKey: colorStatus
  } = color || {}
  const {
    display: dimensionsDisplay,
    hasValue: hasDimensions,
    generating: dimensionsGenerating,
    statusKey: dimensionsStatus
  } = dimensions || {}
  const {
    value: tagList,
    hasValue: hasTags,
    generating: tagsGenerating,
    statusKey: tagsStatus
  } = tags || {}

  const { id: productId } = product || {}

  return (
    <ProductGroup title={t("analysis")}>
      <ProductAnalysisField
        plain
        label={t("color_label")}
        icon={IconPalette}
        hasValue={hasColor}
        generating={!analysisFailed && colorGenerating}
        statusKey={!analysisFailed && colorStatus}
        avatar={hasColor && !colorGenerating &&
          <span
            className={cn("block h-full w-full", !colorHex && "bg-gray-200")}
            style={colorHex ? { backgroundColor: colorHex } : undefined}
            title={colorName}
            aria-label={t("color", { color: colorName })}
          />
        }
        editLabel={t("edit_color")}
        onEdit={() => showProductColorModal({ productId })}
      >
        <span className="text-sm capitalize text-gray-600">{colorName}</span>
      </ProductAnalysisField>
      <ProductAnalysisField
        plain
        label={t("dimensions")}
        icon={IconRuler2}
        hasValue={hasDimensions}
        generating={!analysisFailed && dimensionsGenerating}
        statusKey={!analysisFailed && dimensionsStatus}
        editLabel={t("edit_dimensions")}
        onEdit={() => showProductDimensionsModal({ productId })}
      >
        <span className="text-sm tabular-nums text-gray-600">{dimensionsDisplay}</span>
      </ProductAnalysisField>
      <ProductAnalysisField
        plain
        label={t("tags")}
        icon={IconTags}
        hasValue={hasTags}
        generating={!analysisFailed && tagsGenerating}
        statusKey={!analysisFailed && tagsStatus}
        editLabel={t("edit_tags")}
        onEdit={() => showProductTagsModal({ productId })}
      >
        <div className="flex flex-wrap items-center gap-1">
          {(tagList || []).map((tag) => (
            <Badge
              key={tag}
              size="xs"
              variant="light"
              color="gray"
              title={tag}
              className="capitalize"
            >
              {tag}
            </Badge>
          ))}
        </div>
      </ProductAnalysisField>
    </ProductGroup>
  )
}
