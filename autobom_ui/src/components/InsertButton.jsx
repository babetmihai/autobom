import { ActionIcon, Loader } from "@mantine/core"
import { IconPlus } from "@tabler/icons-react"
import { useTranslation } from "react-i18next"

export default function InsertButton({ onClick, className, title, disabled, loading }) {
  const { t } = useTranslation()
  const label = title || t("insert_model")
  return (
    <ActionIcon
      title={label}
      aria-label={label}
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
