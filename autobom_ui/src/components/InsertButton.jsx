import { ActionIcon, Loader } from "@mantine/core"
import { IconPlus } from "@tabler/icons-react"

export default function InsertButton({ onClick, className, title = "Insert model", disabled, loading }) {
  return (
    <ActionIcon
      title={title}
      aria-label={title}
      disabled={disabled || loading}
      color="brand"
      variant="filled"
      size="sm"
      className={className}
      onClick={onClick}
    >
      {loading && <Loader size={14} color="white" />}
      {!loading && <IconPlus size={14} stroke={2} />}
    </ActionIcon>
  )
}
