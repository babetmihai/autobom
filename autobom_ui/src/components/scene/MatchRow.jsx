import { useHistory } from "react-router-dom"
import { useSelector } from "react-redux"
import { selectListQuantities } from "../../lib/list.js"
import { formatPrice, resolveProductView } from "../../lib/products.js"
import ProductActions from "../ProductActions.jsx"
import { useTranslation } from "react-i18next"


export default function MatchRow({
  match,
  product,
  sceneId,
  inSketchup = true,
  glbSupported = true
}) {
  const { t } = useTranslation()
  const history = useHistory()
  const listQuantities = useSelector(() => selectListQuantities())

  const { productId: matchProductId, score = 0 } = match || {}
  const { id: productRecordId } = product || {}

  const productId = matchProductId || productRecordId
  const scorePercent = Math.round(score * 100)
  const listCount = productId ? Number(listQuantities[String(productId)]) || 0 : 0

  const view = product ? resolveProductView(product) : null
  const { name, price, currency, imageUrl } = view || {}
  const label = name || t("catalog_item")
  const priceDisplay = formatPrice(price, currency)

  const openProduct = (event) => {
    event.stopPropagation()
    if (!productId) return

    let from = "/scene-analyzer"
    if (sceneId) from = `/scene-analyzer/${sceneId}`
    history.push({
      pathname: `/product/${productId}`,
      state: { from, fromLabel: "scene" }
    })
  }

  return (
    <li className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50">
      <div
        className="flex min-w-0 flex-1 cursor-pointer items-center gap-3"
        onClick={openProduct}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault()
            openProduct(event)
          }
        }}
        role="link"
        tabIndex={0}
        aria-label={t("open_product_match", { name: label, percent: scorePercent })}
      >
        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-gray-100">
          {imageUrl &&
            <img
              src={imageUrl}
              alt=""
              className="h-full w-full object-contain"
            />
          }
        </div>
        <div className="min-w-0 flex-1">
          <p className="m-0 truncate text-sm font-medium text-gray-900">{label}</p>
          <p className="m-0 mt-0.5 text-xs text-gray-500">{t("percent_match", { percent: scorePercent })}</p>
          {priceDisplay &&
            <p className="m-0 mt-1 text-sm font-semibold text-brand-600">{priceDisplay}</p>
          }
          {inSketchup && listCount > 0 &&
            <p className="m-0 mt-1 text-xs font-medium text-green-800">{t("in_list", { count: listCount })}</p>
          }
        </div>
      </div>

      {view &&
        <ProductActions
          view={view}
          inSketchup={inSketchup}
          glbSupported={glbSupported}
        />
      }
    </li>
  )
}
