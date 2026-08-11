import _ from "lodash"
import { selectTagged } from "./tags.js"
import { isInSketchup } from "./sketchup.js"

/** Extension: quantities from tagged model instances in the SketchUp document. */
export const selectListQuantities = () => {
  if (!isInSketchup()) return {}
  return selectTagged()
}

export const selectListItemCount = () =>
  _.sum(_.values(selectListQuantities()).map((n) => Number(n) || 0))
