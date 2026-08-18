import { ActionIcon, Box, Group, Stack, Text, Tooltip } from "@mantine/core"
import { useSelector } from "react-redux"
import { IconLayoutSidebarLeftCollapse, IconLayoutSidebarLeftExpand, IconLogout } from "@tabler/icons-react"
import { useTranslation } from "react-i18next"
import { AppNav } from "./AppNav.jsx"
import { selectAuthEmail, signOut } from "../lib/auth.js"
import { useLoader } from "../lib/loaders.js"
import { actions } from "../lib/store/index.js"
import { cn } from "../lib/index.js"

const appActions = actions.create("app")

export function AppShell({ header, children }) {
  const { t } = useTranslation()
  const { sidebarCollapsed = false } = useSelector(() => appActions.get())
  const email = useSelector(() => selectAuthEmail())
  const signingOut = useLoader("auth.signOut")
  const collapsed = Boolean(sidebarCollapsed)

  const toggleSidebar = () => {
    appActions.set("sidebarCollapsed", !collapsed)
  }

  return (
    <Box className="flex h-screen overflow-hidden bg-gray-100 text-gray-800">
      <Box
        component="aside"
        className={cn(
          "flex shrink-0 flex-col border-r border-gray-200 bg-white py-4 transition-[width] duration-200",
          collapsed ? "w-[3.75rem] items-center px-2" : "w-[14rem] px-3"
        )}
      >
        <Group
          justify={collapsed ? "center" : "space-between"}
          wrap="nowrap"
          mb="md"
          px={collapsed ? 0 : "xs"}
          gap="xs"
        >
          {!collapsed &&
            <p className="m-0 min-w-0 truncate text-lg font-medium text-gray-800">
              Autobom
            </p>
          }
          <Tooltip
            label={collapsed ? t("expand_sidebar") : t("collapse_sidebar")}
            position="right"
            withArrow
          >
            <ActionIcon
              variant="subtle"
              color="gray"
              size="lg"
              radius="xl"
              onClick={toggleSidebar}
              aria-label={collapsed ? t("expand_sidebar") : t("collapse_sidebar")}
              aria-expanded={!collapsed}
            >
              {collapsed && <IconLayoutSidebarLeftExpand size={18} stroke={1.75} />}
              {!collapsed && <IconLayoutSidebarLeftCollapse size={18} stroke={1.75} />}
            </ActionIcon>
          </Tooltip>
        </Group>

        <AppNav collapsed={collapsed} />

        <Stack
          gap={4}
          mt="auto"
          pt="md"
          className={collapsed ? "items-center" : undefined}
        >
          {!collapsed && email &&
            <Text
              size="xs"
              c="dimmed"
              px="xs"
              className="truncate"
              title={email}
            >
              {email}
            </Text>
          }
          {collapsed &&
            <Tooltip
              label={email ? t("sign_out_with_email", { email }) : t("sign_out")}
              position="right"
              withArrow
            >
              <ActionIcon
                variant="subtle"
                color="gray"
                size="lg"
                radius="xl"
                loading={signingOut}
                onClick={() => void signOut()}
                aria-label={t("sign_out")}
              >
                <IconLogout size={18} stroke={1.75} />
              </ActionIcon>
            </Tooltip>
          }
          {!collapsed &&
            <ActionIcon
              variant="subtle"
              color="gray"
              size="lg"
              radius="xl"
              loading={signingOut}
              onClick={() => void signOut()}
              aria-label={t("sign_out")}
            >
              <IconLogout size={18} stroke={1.75} />
            </ActionIcon>
          }
        </Stack>
      </Box>

      <Box className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {header &&
          <Box className="relative shrink-0 border-b border-gray-200 bg-white">
            {header}
          </Box>
        }
        <Box
          component="main"
          className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-4 sm:px-6 sm:py-6"
        >
          {children}
        </Box>
      </Box>
    </Box>
  )
}

export function PageHeader({ title, description }) {
  return (
    <div className="px-4 py-3 sm:px-6">
      <h1 className="m-0 truncate text-lg font-medium text-gray-800">
        {title}
      </h1>
      {description &&
        <p className="m-0 mt-1 text-sm leading-5 text-gray-500">
          {description}
        </p>
      }
    </div>
  )
}
