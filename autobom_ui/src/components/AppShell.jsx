import { ActionIcon, Box, Button, Group, Stack, Text, Title, Tooltip } from "@mantine/core"
import { useSelector } from "react-redux"
import { IconLayoutSidebarLeftCollapse, IconLayoutSidebarLeftExpand, IconLogout } from "@tabler/icons-react"
import { AppNav } from "./AppNav.jsx"
import { selectAuthEmail, signOut } from "../lib/auth.js"
import { useLoader } from "../lib/loaders.js"
import { actions } from "../lib/store/index.js"
import { cn } from "../lib/index.js"

const appActions = actions.create("app")

export function AppShell({ header, children }) {
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
            <Title order={2} size="h4" className="m-0 min-w-0 truncate text-gray-800">
              Autobom
            </Title>
          }
          <Tooltip
            label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            position="right"
            withArrow
          >
            <ActionIcon
              variant="subtle"
              color="gray"
              size="md"
              onClick={toggleSidebar}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
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
            <Tooltip label={email ? `Sign out (${email})` : "Sign out"} position="right" withArrow>
              <ActionIcon
                variant="default"
                size="lg"
                loading={signingOut}
                onClick={() => void signOut()}
                aria-label="Sign out"
              >
                <IconLogout size={18} stroke={1.75} />
              </ActionIcon>
            </Tooltip>
          }
          {!collapsed &&
            <Button
              variant="default"
              size="compact-sm"
              loading={signingOut}
              onClick={() => void signOut()}
            >
              Sign out
            </Button>
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
    <Box className="px-4 py-4 sm:px-6">
      <Group
        justify="space-between"
        align="flex-start"
        gap="sm"
        wrap="nowrap"
      >
        <Box className="min-w-0 flex-1">
          <Title order={1} size="h3" className="m-0 text-gray-800">
            {title}
          </Title>
          {description &&
            <Text size="sm" c="dimmed" className="mt-1">
              {description}
            </Text>
          }
        </Box>
      </Group>
    </Box>
  )
}
