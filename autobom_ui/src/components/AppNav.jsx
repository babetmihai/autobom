import { NavLink } from "react-router-dom"

export function AppNav() {
  return (
    <nav className="ab-nav-tabs" aria-label="Main">
      <NavLink
        to="/"
        isActive={(_, location) => {
          const path = location.pathname
          return path === "/" || path.startsWith("/product/")
        }}
        className="ab-nav-tab"
        activeClassName="ab-nav-tab-active"
      >
        Product Catalog
      </NavLink>
      <NavLink
        to="/scene-analyzer"
        isActive={(_, location) => location.pathname.startsWith("/scene-analyzer")}
        className="ab-nav-tab"
        activeClassName="ab-nav-tab-active"
      >
        Scene Analyzer
      </NavLink>
    </nav>
  )
}
