import { useSelector } from "react-redux"
import { hideModal, ModalContext, selectModal } from "../lib/modals.js"


export default function ModalDispatcher() {
  const modal = useSelector(() => selectModal())
  const { Component, props } = modal || {}
  const { onClose = hideModal } = props || {}

  if (!Component) return null

  return (
    <ModalContext.Provider value={{ withOverlay: true }}>
      <Component
        {...props}
        onClose={onClose}
      />
    </ModalContext.Provider>
  )
}
