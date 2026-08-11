import _ from "lodash"
import { FieldPath, FieldValue, Query as TFirestoreQuery } from "firebase-admin/firestore"
import { TRUE, getSearchIndex, tokenize } from "./index.js"
import { v7 } from "uuid"
import dayjs from "dayjs"
import { versionRef, db } from "./firebase"


const PAGE_SIZE = 1000
const DEFAULT_SEARCH_FIELDS = ["name", "tags"]

type TDocValues = Record<string, unknown>

type TListQuery = {
  ids?: string[]
  lastId?: string
  pageSize?: number
  search?: string
} & Record<string, unknown>

type TPayload = TDocValues | ((ctx: TDocValues) => TDocValues | Promise<TDocValues>)

type TCreateServicesOptions = {
  before?: (values: TDocValues) => TDocValues | Promise<TDocValues>
  after?: (item: TDocValues) => void | Promise<void>
  searchFields?: string[]
}

export const createServices = (
  path: string,
  { before = _.identity, after, searchFields = [] }: TCreateServicesOptions = {}
) => {
  const fields = _.uniq([...DEFAULT_SEARCH_FIELDS, ...searchFields])

  const getSearchParts = (values: TDocValues, existing: TDocValues = {}) =>
    fields.flatMap((field) => {
      let part
      if (field === "tags") {
        const { tags: existingTags = {} } = existing || {}
        const tags = values.tags ?? existingTags ?? {}
        part = Object.entries(tags).filter(([, value]) => value === TRUE).map(([key]) => key)
      } else {
        part = values[field] ?? (existing || {})[field]
      }
      return _.castArray(part).filter(Boolean)
    })

  const services = {
    get: async (id: string) => {
      const item = await versionRef.collection(path)
        .doc(id)
        .get()
        .then((doc) => doc.data())

      if (item) return _.omit(item, ["_search", "_active"])
    },
    create: async (payload: TPayload) => {
      const id = v7()
      const ref = versionRef.collection(path).doc(id)
      const now = dayjs().valueOf()
      const values = typeof payload === "function" ? await payload({ id }) : payload
      const _search = getSearchIndex(...getSearchParts(values))
      const _values = await before({
        _active: TRUE,
        ...values,
        createdAt: now,
        updatedAt: now,
        _search,
        id
      })
      await ref.set(_values)
      const item = await services.get(id)
      if (after) await after(item)
      return item
    },
    update: async (id: string, payload: TPayload) => {
      const now = dayjs().valueOf()
      const ref = versionRef.collection(path).doc(id)
      const existing = await services.get(id)

      if (existing) {
        const values = typeof payload === "function" ? await payload(existing) : payload
        if (fields.some((field) => field in values)) {
          values._search = getSearchIndex(...getSearchParts(values, existing))
        } else {
          delete values._search
        }
        const _values = await before({
          ...values,
          id,
          updatedAt: now
        })
        await ref.update(_values)
      } else {
        const values = typeof payload === "function" ? await payload({ id }) : payload
        const _search = getSearchIndex(...getSearchParts(values))
        const _values = await before({
          _active: TRUE,
          ...values,
          createdAt: now,
          updatedAt: now,
          _search,
          id
        })
        await ref.set(_values)
      }

      const item = await services.get(id)
      if (after) await after(item)
      return item
    },
    list: async (query: TListQuery = {}) => {
      const {
        ids,
        lastId,
        pageSize = PAGE_SIZE,
        ...rest
      } = query

      switch (true) {
        case (!_.isEmpty(ids)): {
          const ref = versionRef.collection(path)
          const refs = _.uniq(ids).map(id => ref.doc(id))
          const items = await db.getAll(...refs).then((docs) => docs.map((doc) => doc.data()))
          return items
            .filter((item) => {
              const { _active } = item || {}
              return _active === TRUE
            })
            .map((item) => _.omit(item, ["_search", "_active"]))
            .filter(Boolean)
        }
        default: {
          let ref: TFirestoreQuery = versionRef.collection(path)
          for (const [key, value] of Object.entries(rest)) {
            switch (true) {
              case (key === "search"): {
                for (const term of tokenize(String(value))) {
                  const path = new FieldPath("_search", term)
                  ref = ref.where(path, "==", TRUE)
                }
                break
              }
              case (key.includes(".")): {
                const path = new FieldPath(...key.split("."))
                ref = ref.where(path, "==", value)
                break
              }
              default: {
                ref = ref.where(key, "==", value)
                break
              }
            }
          }
          ref = ref.where("_active", "==", TRUE)
          ref = ref.orderBy("__name__", "desc")
          if (lastId) {
            const lastDoc = await versionRef.collection(path).doc(lastId).get()
            if (lastDoc.exists) {
              ref = ref.startAfter(lastDoc)
            }
          }
          ref = ref.limit(Number(pageSize))
          return ref.get().then((data) => data.docs.map((doc) => doc.data()))
        }
      }
    },
    delete: async (id: string) => services.update(id, { _active: FieldValue.delete() })
  }

  return services
}

export const getNull = () => FieldValue.delete()
