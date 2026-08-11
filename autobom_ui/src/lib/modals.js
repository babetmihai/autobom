import React from "react"
import { actions } from "./store/index.js"
import { EMPTY_OBJECT } from "./index.js"


export const selectModal = () => actions.get("modal", EMPTY_OBJECT)

export const showModal = (Component, props) => actions.update("modal", (modal = {}) => ({
  ...modal,
  Component,
  props
}))

export const hideModal = () => actions.unset("modal")

export const ModalContext = React.createContext(EMPTY_OBJECT)
