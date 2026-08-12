import { createTheme } from "@mantine/core"

/** Primary brand — Autobom blue (#0696d7) as Mantine shade 5; shade 6 matches former brand-dark. */
const brand = [
  "#e6f7fc",
  "#c2ebf7",
  "#9adcf0",
  "#6fcbe8",
  "#3fb8df",
  "#0696d7",
  "#0580b8",
  "#046a99",
  "#03557a",
  "#023f5c"
]

const theme = createTheme({
  primaryColor: "brand",
  colors: {
    brand
  },
  fontFamily: "system-ui, -apple-system, \"Segoe UI\", Roboto, sans-serif",
  defaultRadius: "md",
  cursorType: "pointer"
})

export default theme
