/**
 * Redux Setup
 *
 * Install the redux-dev-tools extension when developing: https://chromewebstore.google.com/detail/redux-devtools/lmhkpmbekcpmknklioeibfkpmmfibljd?hl=en
 * The project uses a single reducer and a few generic actions that are based on lodash which are more than enough for any use case.
 * For more complicated actions, I recoment you use `redux-saga` in adition to this.
*/

import { applyMiddleware, compose } from "redux"
import { StateActions, createStore } from "./utils"
import { storageMiddleware } from "./storage"

// @ts-ignore
const devToolsComposer = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__
const composeEnhancers = devToolsComposer
  ? devToolsComposer({})
  : compose

const store = createStore(composeEnhancers(applyMiddleware(
  storageMiddleware
)))


export const actions = new StateActions(store)

export default store