import React from "react"
import _ from "lodash"
import { actions } from "../lib/store/index.js"
import { EMPTY_OBJECT } from "./index.js"
import { useSelector } from "react-redux"


export const selectTagged = () => actions.get("taggedInstances", EMPTY_OBJECT)

export const useTagListener = () => {
  const taggedInstances = useSelector(() => selectTagged())
  React.useEffect(() => {
    const onDocumentUsage = (raw) => {
      const { tagged_instances } = raw
      actions.set("taggedInstances", _.mapValues(tagged_instances, Number))
    }


    window.__documentUsage = onDocumentUsage
    return () => {
      if (window.__documentUsage === onDocumentUsage) delete window.__documentUsage
    }
  }, [])


  return taggedInstances
}
