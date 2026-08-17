import { showBanner } from "./banner"
import i18n from "./i18n/index.js"

const escapeCsvName = (name) => `"${String(name ?? "").replace(/"/g, "\"\"")}"`

const buildBOMCsv = (list, quantities) => {
  const lineData = list
    .map((m) => {
      const count = Number(quantities[String(m.id)]) || 0
      const unitPrice = m.price != null ? Number(m.price) : null
      const totalPrice = unitPrice != null ? unitPrice * count : null
      return {
        m,
        count,
        unitPrice,
        totalPrice,
        lineTotal: totalPrice || 0
      }
    })
    .filter(({ count }) => count > 0)

  if (lineData.length === 0) return null

  const lines = lineData.map(({ m, count, unitPrice, totalPrice }) =>
    [
      escapeCsvName(m.name || m.id),
      m.id,
      count,
      m.currency || "RON",
      unitPrice != null ? unitPrice.toFixed(2) : "",
      totalPrice != null ? totalPrice.toFixed(2) : ""
    ].join(",")
  )

  const grandTotal = lineData.map(({ lineTotal }) => lineTotal).reduce((sum, n) => sum + n, 0)

  const headerRow = [
    i18n.t("product_name"),
    i18n.t("product_id"),
    i18n.t("quantity"),
    i18n.t("currency"),
    i18n.t("unit_price"),
    i18n.t("total")
  ].join(",")

  const footerRow = ["", "", "", "", i18n.t("grand_total_csv"), grandTotal.toFixed(2)].join(",")
  return { content: [headerRow, ...lines, footerRow].join("\n"), itemCount: lines.length }
}

export const exportBOM = ({ quantities, list }) => {
  const bom = buildBOMCsv(list, quantities)
  if (!bom) {
    showBanner("info", i18n.t("no_products_to_export"))
    return
  }

  const date = new Date().toISOString().split("T")[0]
  downloadCSV(bom.content, `bill-of-materials-${date}.csv`)
  showBanner("success", i18n.t("bom_exported", { count: bom.itemCount }))
}

const downloadCSV = (content, filename) => {
  const blob = new Blob(["\ufeff" + content], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
