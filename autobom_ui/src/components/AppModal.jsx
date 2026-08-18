import { Modal, Box } from "@mantine/core"
import { hideModal } from "../lib/modals.js"


export default function AppModal({
  name,
  children,
  footer,
  onClose = hideModal,
  className,
  contentClassName
}) {
  return (
    <Modal
      opened
      onClose={onClose}
      title={name}
      centered
      size="lg"
      radius="lg"
      className={className}
      classNames={{
        body: contentClassName
      }}
    >
      {children}
      {footer &&
        <Box mt="md" pt="sm" className="border-t border-gray-200">
          {footer}
        </Box>
      }
    </Modal>
  )
}
