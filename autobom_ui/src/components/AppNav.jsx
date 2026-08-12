import { NavLink as RouterNavLink, useLocation } from "react-router-dom"
import { useSelector } from "react-redux"
import { ActionIcon, Badge, NavLink, Stack, Tooltip } from "@mantine/core"
import { IconBox, IconList, IconPhotoScan } from "@tabler/icons-react"
import { selectListItemCount } from "../lib/list.js"
import { isInSketchup } from "../lib/sketchup.js"

const items = [
  {
    to: "/",
    label: "Product Catalog",
    icon: IconBox,
    isActive: (path) => path === "/"
  },
  {
    to: "/scene-analyzer",
    label: "Scene Analyzer",
    icon: IconPhotoScan,
    isActive: (path) => path.startsWith("/scene-analyzer")
  }
]

export function AppNav({ collapsed = false }) {
  const location = useLocation()
  const path = location.pathname
  const listCount = useSelector(() => selectListItemCount())
  const inSketchup = isInSketchup()
  const listActive = path === "/list" || path.startsWith("/list/")

  if (collapsed) {
    return (
      <Stack
        component="nav"
        gap={4}
        aria-label="Main"
        className="flex-1 items-center"
      >
        {items.map(({ to, label, icon: Icon, isActive }) => (
          <Tooltip
            key={to}
            label={label}
            position="right"
            withArrow
          >
            <ActionIcon
              component={RouterNavLink}
              to={to}
              variant={isActive(path) ? "light" : "subtle"}
              color={isActive(path) ? "brand" : "gray"}
              size="lg"
              aria-label={label}
              activeClassName=""
            >
              <Icon size={18} stroke={1.75} />
            </ActionIcon>
          </Tooltip>
        ))}
        {inSketchup &&
          <Tooltip
            label={listCount > 0 ? `List (${listCount})` : "List"}
            position="right"
            withArrow
          >
            <ActionIcon
              component={RouterNavLink}
              to="/list"
              variant={listActive ? "light" : "subtle"}
              color={listActive ? "brand" : "gray"}
              size="lg"
              aria-label={listCount > 0 ? `List, ${listCount} items` : "List"}
              className="relative"
              activeClassName=""
            >
              <IconList size={18} stroke={1.75} />
              {listCount > 0 &&
                <Badge
                  size="xs"
                  circle
                  color="brand"
                  variant="filled"
                  className="absolute -right-1 -top-1"
                >
                  {listCount > 99 ? "99+" : listCount}
                </Badge>
              }
            </ActionIcon>
          </Tooltip>
        }
      </Stack>
    )
  }

  return (
    <Stack
      component="nav"
      gap={4}
      aria-label="Main"
      className="flex-1"
    >
      {items.map(({ to, label, icon: Icon, isActive }) => (
        <NavLink
          key={to}
          component={RouterNavLink}
          to={to}
          label={label}
          leftSection={<Icon size={18} stroke={1.75} />}
          active={isActive(path)}
          variant="light"
          color="brand"
        />
      ))}
      {inSketchup &&
        <NavLink
          component={RouterNavLink}
          to="/list"
          label="List"
          leftSection={<IconList size={18} stroke={1.75} />}
          rightSection={
            listCount > 0 &&
              <Badge
                size="sm"
                circle
                color="brand"
                variant="filled"
              >
                {listCount > 99 ? "99+" : listCount}
              </Badge>
          }
          active={listActive}
          variant="light"
          color="brand"
          aria-label={listCount > 0 ? `List, ${listCount} items` : "List"}
        />
      }
    </Stack>
  )
}
