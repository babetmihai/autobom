import { ActionIcon, Loader, Tooltip } from "@mantine/core"
import { IconPencil, IconRefresh } from "@tabler/icons-react"
import { cn, materialCardClass, materialStatusTone } from "../lib/index.js"
import { useTranslation } from "react-i18next"

export default function ProductAnalysisField({
  label,
  icon: Icon,
  hasValue = false,
  generating = false,
  failed = false,
  statusKey,
  avatar,
  retryLabel,
  onRetry,
  editLabel,
  onEdit,
  plain = false,
  children
}) {
  const { t } = useTranslation()
  const { statusClass, dotClass, avatarClass } = materialStatusTone({
    ready: hasValue,
    generating,
    failed
  })
  const showStatus = !hasValue || generating || failed

  return (
    <article
      className={cn(
        plain && "px-4 py-2 hover:bg-gray-50",
        !plain && materialCardClass({ ready: hasValue, generating, failed })
      )}
    >
      <div className="flex items-center gap-2.5">
        <div
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full",
            !avatar && avatarClass
          )}
        >
          {generating &&
            <Loader size={14} color="brand" />
          }
          {!generating && avatar}
          {!generating && !avatar && Icon &&
            <Icon size={16} stroke={1.75} />
          }
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <p className="m-0 shrink-0 text-sm font-medium text-gray-900">
              {label}
            </p>
            {hasValue && children &&
              <div className="min-w-0 truncate">{children}</div>
            }
          </div>
          {showStatus &&
            <p className={cn("m-0 mt-0.5 flex items-center gap-1.5 text-xs leading-4", statusClass)}>
              <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", dotClass)} />
              <span className="truncate">{t(statusKey)}</span>
            </p>
          }
        </div>
        {(onEdit || (failed && onRetry)) &&
          <div className="flex shrink-0 items-center">
            {onEdit &&
              <Tooltip label={editLabel}>
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  size="md"
                  radius="xl"
                  aria-label={editLabel}
                  onClick={onEdit}
                >
                  <IconPencil size={16} stroke={1.75} />
                </ActionIcon>
              </Tooltip>
            }
            {failed && onRetry &&
              <Tooltip label={retryLabel}>
                <ActionIcon
                  variant="subtle"
                  color="red"
                  size="md"
                  radius="xl"
                  aria-label={retryLabel}
                  onClick={onRetry}
                >
                  <IconRefresh size={16} stroke={1.75} />
                </ActionIcon>
              </Tooltip>
            }
          </div>
        }
      </div>
    </article>
  )
}
