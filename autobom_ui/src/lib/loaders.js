import { useSelector } from "react-redux"
import { actions } from "./store/index.js"
import { EMPTY_OBJECT } from "./index.js"


export const useLoader = (path) => {
  return useSelector(() => actions.get(`loaders.${path}`, 0) > 0)
}

export const selectLoaders = (path) => actions.get(`loaders.${path}`, EMPTY_OBJECT)

export const selectLoader = (path) => actions.get(`loaders.${path}`, 0) > 0

export const setLoader = (path) => actions.update(`loaders.${path}`, (count = 0) => count + 1)

export const clearLoader = (path) => actions.unset(`loaders.${path}`)
