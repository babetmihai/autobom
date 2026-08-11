import React from "react"

/** SketchUp HtmlDialog → Ruby `import_model` callback. Payload is JSON-serialized. */
export const importModel = ({
  id,
  model_url,
  mode = "import",
  /** `glb` | `collada` (COLLADA zip bundle) | `sketchup` (legacy .skp). */
  source = "glb"
}) => {
  let src = "glb"
  switch (true) {
    case source === "sketchup": {
      src = "sketchup"
      break
    }
    case source === "collada": {
      src = "collada"
      break
    }
  }
  globalThis.sketchup?.import_model?.(JSON.stringify({ id, model_url, mode, source: src }))
}

export const getDocumentUsage = () => {
  globalThis.sketchup?.get_document_usage?.("")
}

export const getEnvironment = () => {
  globalThis.sketchup?.get_environment?.("")
}

/** True when the HtmlDialog Ruby bridge is available (not a standalone browser session). */
export const isInSketchup = () => Boolean(globalThis.sketchup?.import_model)

/** Native GLB import requires SketchUp 2025+ (Ruby reports major version 25). */
export const glbNativeImport = (env) => Boolean(env?.glb_native_import)

export const useSketchupEnvListener = (onEnv) => {
  React.useEffect(() => {
    const handler = (payload) => {
      onEnv?.(payload || {})
    }
    window.__sketchupEnv = handler
    getEnvironment()
    return () => {
      if (window.__sketchupEnv === handler) delete window.__sketchupEnv
    }
  }, [onEnv])
}

/** Native SketchUp UI.messagebox — only works inside HtmlDialog. */
export const showMessage = (message) => {
  globalThis.sketchup?.show_message?.(`${message ?? ""}`)
}


const sketchup = {
  importModel,
  getDocumentUsage,
  getEnvironment,
  isInSketchup,
  glbNativeImport,
  useSketchupEnvListener,
  showMessage
}

export default sketchup