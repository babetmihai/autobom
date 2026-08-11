import _ from "lodash"
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  documentId,
  FieldPath
} from "firebase/firestore"
import { getFirestoreDb, getFirestoreVersion } from "./firebase.js"

const PAGE_SIZE = 1000
const TRUE = "TRUE"
const MIN_SEARCH_TERM = 2

const normalizeString = (string = "") => string
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase()

const tokenize = (string = "") => normalizeString(string)
  .split(/[^a-z0-9]+/)
  .filter((word) => word.length >= MIN_SEARCH_TERM)

const getSearchQueryTerms = (string = "") => tokenize(string)

const sanitize = (item) => {
  if (item) {
    return _.omit(item, ["_search", "_active"])
  }
}

const mapCollection = (snapshot) => snapshot.docs.map((docSnap) => docSnap.data())

const getCollectionRef = (path) => {
  const db = getFirestoreDb()
  const version = getFirestoreVersion()
  return collection(db, "versions", version, path)
}

const getDocRef = (path, id) => {
  const db = getFirestoreDb()
  const version = getFirestoreVersion()
  return doc(db, "versions", version, path, id)
}

export const createServices = (path) => {
  const services = {
    get: async (id) => {
      const snap = await getDoc(getDocRef(path, id))
      const item = snap.exists() ? snap.data() : undefined
      return sanitize(item)
    },
    list: async (queryParams = {}) => {
      const {
        ids,
        lastId,
        pageSize = PAGE_SIZE,
        ...rest
      } = queryParams

      switch (true) {
        case (!_.isEmpty(ids)): {
          const uniqueIds = _.uniq(ids)
          const snaps = await Promise.all(
            uniqueIds.map((id) => getDoc(getDocRef(path, id)))
          )
          const items = snaps
            .filter((snap) => snap.exists())
            .map((snap) => snap.data())
          return items
            .filter((item) => item._active === TRUE)
            .map((item) => sanitize(item))
            .filter(Boolean)
        }
        default: {
          const constraints = []
          for (const [key, value] of Object.entries(rest)) {
            switch (true) {
              case (key === "search"): {
                for (const term of getSearchQueryTerms(value)) {
                  constraints.push(where(new FieldPath("_search", term), "==", TRUE))
                }
                break
              }
              case (key.includes(".")): {
                constraints.push(where(new FieldPath(...key.split(".")), "==", value))
                break
              }
              default: {
                constraints.push(where(key, "==", value))
                break
              }
            }
          }
          constraints.push(where("_active", "==", TRUE))
          constraints.push(orderBy(documentId(), "desc"))
          if (lastId) {
            const lastDoc = await getDoc(getDocRef(path, lastId))
            if (lastDoc.exists()) {
              constraints.push(startAfter(lastDoc))
            }
          }
          constraints.push(limit(Number(pageSize)))
          const snapshot = await getDocs(query(getCollectionRef(path), ...constraints))
          return mapCollection(snapshot).map((item) => sanitize(item))
        }
      }
    }
  }

  return services
}

export { getDocRef }
