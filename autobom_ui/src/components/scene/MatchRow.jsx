import { useHistory } from "react-router-dom"
import { useSelector } from "react-redux"
import { cn } from "../../lib/index.js"
import { selectListQuantities } from "../../lib/list.js"
import { formatPrice, resolveProductView } from "../../lib/products.js"
import ProductActions from "../ProductActions.jsx"


export default function MatchRow({
  match,
  product,
  sceneId,
  inSketchup = true,
  glbSupported = true
}) {
  const history = useHistory()
  const listQuantities = useSelector(() => selectListQuantities())

  const { productId: matchProductId, score = 0 } = match || {}
  const { id: productRecordId } = product || {}

  const productId = matchProductId || productRecordId
  const scorePercent = Math.round(score * 100)
  const listCount = productId ? Number(listQuantities[String(productId)]) || 0 : 0

  const view = product ? resolveProductView(product) : null

  const { title: viewTitle, name: viewName, price, currency } = view || {}
  const title = viewTitle || viewName || "Catalog item"
  const priceDisplay = formatPrice(price, currency)
  const thumbUrl = view?.imageUrl

  const openProduct = (event) => {
    event.stopPropagation()
    if (!productId) return

    const from = sceneId ? `/scene-analyzer/${sceneId}` : "/scene-analyzer"
    history.push({
      pathname: `/product/${productId}`,
      state: { from, fromLabel: "Scene" }
    })
  }

  return (
    <li
      className={cn(
        "flex items-center gap-2 rounded-md border border-gray-100 bg-gray-50 p-2",
        "transition-colors hover:border-gray-200 hover:bg-white"
      )}
    >
      <div
        className="flex min-w-0 flex-1 cursor-pointer items-center gap-2"
        onClick={openProduct}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault()
            openProduct(event)
          }
        }}
        role="link"
        tabIndex={0}
        aria-label={`Open ${title}, ${scorePercent}% match`}
      >
        {thumbUrl &&
          <img
            src={thumbUrl}
            alt=""
            className="h-10 w-10 shrink-0 rounded object-cover"
          />
        }
        {!thumbUrl &&
          <div className="h-10 w-10 shrink-0 rounded bg-gray-200" />
        }
        <div className="min-w-0 flex-1">
          <p className="m-0 truncate text-sm font-medium text-gray-800">{title}</p>
          <p className="m-0 text-xs text-gray-500">{scorePercent}% match</p>
          {priceDisplay &&
            <p className="m-0 mt-0.5 text-xs font-semibold text-brand-500">{priceDisplay}</p>
          }
          {inSketchup && listCount > 0 &&
            <p className="m-0 mt-0.5 text-xs font-medium text-green-800">In list: {listCount}</p>
          }
        </div>
      </div>

      {view &&
        <ProductActions
          view={view}
          inSketchup={inSketchup}
          glbSupported={glbSupported}
          inline
        />
      }
    </li>
  )
}
