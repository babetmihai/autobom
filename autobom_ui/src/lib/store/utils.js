/*
  Redux Store and Actions
  This will use the lodash _.get, _.set, _.unset and _.update syntax to interact with the state
  https://lodash.com/docs/4.17.21#set
*/
import _ from "lodash"
import setWith from "lodash/fp/setWith"
import unset from "lodash/fp/unset"
import updateWith from "lodash/fp/updateWith"
import { legacy_createStore } from "redux"
import { EMPTY_OBJECT } from "../index.js"


const SET = "@@SET"
const UPDATE = "@@UPDATE"
const UNSET = "@@UNSET"


export const createStore = (middleware) => legacy_createStore(reducer, {}, middleware)


export class StateActions {
  store
  basePaths = []

  constructor(store) {
    this.store = store
  }

  /**
   * Gets the value at path of the state object, using lodash/get: https://lodash.com/docs/4.17.21#get
   * If the resolved value is undefined, the defaultValue is returned in its place.
   * If no path is provided, the state object is returned.
   */
  get(...args) {
    let _path
    let defaultValue = EMPTY_OBJECT
    if (args.length > 0) [_path, defaultValue] = args
    const path = join(...this.basePaths, _path)
    if (!path) return this.store.getState()
    return _.get(this.store.getState(), path, defaultValue)
  }

  /**
   * Sets the value at path of the state object, using lodash/fp/set: https://lodash.com/docs/4.17.21#set
   * If a portion of path doesn't exist, it's created, using the Object constructor.
   * If no path is provided, the state object will be replaced by the provided value.
   */
  set(...args) {
    let _path
    let [payload] = args
    if (args.length > 1) [_path, payload] = args
    const path = join(...this.basePaths, _path)
    this.store.dispatch({
      type: `Set ${stringify(path)}`,
      path,
      payload,
      method: SET
    })
  }

  /**
   * This method is like set except that accepts updater to produce the value to set, using lodash/fp/update: https://lodash.com/docs/4.17.21#update
   * If a plain object is provided as the updater, the object will be assigned to the value at path.
   */
  update(...args) {
    let _path
    let [payload] = args
    if (args.length > 1) [_path, payload] = args
    const path = join(...this.basePaths, _path)
    this.store.dispatch({
      type: `Update ${stringify(path)}`,
      path,
      payload,
      method: UPDATE
    })
  }

  /**
   * Removes the property at path of state object, using lodash/fp/unset: https://lodash.com/docs/4.17.21#unset
   * If no path is provided, the state object will be removed.
   */
  unset(...args) {
    const [_path] = args
    const path = join(...this.basePaths, _path)
    this.store.dispatch({
      type: `Unset ${stringify(path)}`,
      path,
      method: UNSET
    })
  }

  /**
   * Creates a new actions object, that automatically prepends the provided path to all method paths.
   */
  create(path) {
    const clone = new StateActions(this.store)
    clone.basePaths = [...this.basePaths, path]
    return clone
  }
}

const reducer = (state = {}, action) => {
  const { path, method, payload } = action
  switch (method) {
    case SET: {
      if (_.isNil(path)) return payload
      return setWith(Object, path, payload, state)
    }
    case UPDATE: {
      if (_.isNil(payload)) return state
      if (_.isNil(path)) {
        if (_.isFunction(payload)) return payload(state)
        if (_.isPlainObject(state) && _.isPlainObject(payload)) {
          return { ...state, ...payload }
        }
        return payload
      } else {
        if (_.isFunction(payload)) return updateWith(Object, path, payload, state)
        return updateWith(Object, path, (value) => {
          if (_.isPlainObject(value) && _.isPlainObject(payload)) {
            return { ...value, ...payload }
          } else {
            return payload
          }
        }, state)
      }
    }
    case UNSET: {
      if (_.isNil(path)) return {}
      return unset(path, state)
    }
    default: return state
  }
}


const join = (...args) => {
  const _path = args
    .filter(Boolean)
    .map((path) => {
      if (_.isFunction(path)) return path()
      if (_.isString(path)) return path.split(".")
      return path
    })
    .flat()

  if (!_.isEmpty(_path)) return _path.join(".")
  return undefined
}


const stringify = (path) => _.castArray(path).filter(Boolean).join(".")