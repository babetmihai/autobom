import { NavLink as RouterNavLink, useLocation } from "react-router-dom"
import { useSelector } from "react-redux"
import { ActionIcon, Badge, NavLink, Stack, Tooltip } from "@mantine/core"
import { IconBox, IconList, IconPhotoScan } from "@tabler/icons-react"
import { useTranslation } from "react-i18next"
import { selectListItemCount } from "../lib/list.js"
import { isInSketchup } from "../lib/sketchup.js"

const items = [
  {
    to: "/",
    labelKey: "product_catalog",
    icon: IconBox,
    isActive: (path) => path === "/"
  },
  {
    to: "/scene-analyzer",
    labelKey: "scene_analyzer",
    icon: IconPhotoScan,
    isActive: (path) => path.startsWith("/scene-analyzer")
  }
]

export function AppNav({ collapsed = false }) {
  const { t } = useTranslation()
  const location = useLocation()
  const path = location.pathname
  const listCount = useSelector(() => selectListItemCount())
  const inSketchup = isInSketchup()
  const listActive = path === "/list" || path.startsWith("/list/")
  const listLabel = (listCount > 0 && t("list_with_count", { count: listCount })) || t("list")
  const listAria = (listCount > 0 && t("list_items_aria", { count: listCount })) || t("list")

  if (collapsed) {
    return (
      <Stack
        component="nav"
        gap={4}
        aria-label={t("main")}
        className="flex-1 items-center"
      >
        {items.map(({ to, labelKey, icon: Icon, isActive }) => (
          <Tooltip
            key={to}
            label={t(labelKey)}
            position="right"
            withArrow
          >
            <ActionIcon
              component={RouterNavLink}
              to={to}
              exact={true}
              variant={isActive(path) ? "light" : "subtle"}
              color={isActive(path) ? "brand" : "gray"}
              size="lg"
              radius="xl"
              aria-label={t(labelKey)}
              activeClassName=""
            >
              <Icon size={18} stroke={1.75} />
            </ActionIcon>
          </Tooltip>
        ))}
        {inSketchup &&
          <Tooltip
            label={listLabel}
            position="right"
            withArrow
          >
            <ActionIcon
              component={RouterNavLink}
              to="/list"
              variant={listActive ? "light" : "subtle"}
              color={listActive ? "brand" : "gray"}
              size="lg"
              radius="xl"
              aria-label={listAria}
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
      aria-label={t("main")}
      className="flex-1"
    >
      {items.map(({ to, labelKey, icon: Icon, isActive }) => (
        <NavLink
          key={to}
          component={RouterNavLink}
          to={to}
          exact={true}
          label={t(labelKey)}
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
          label={t("list")}
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
          aria-label={listAria}
        />
      }
    </Stack>
  )
}
