import "regenerator-runtime/runtime"
import "core-js/modules/es.global-this"
/** Old Chromium / HtmlDialog: syntax is es2015 but runtime may lack newer builtins. */
import "abort-controller/polyfill"
import "core-js/modules/es.array.flat"
import "core-js/modules/es.array.flat-map"
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { Provider } from "react-redux"
import App from "./App.jsx"
import { ErrorBoundary } from "./ErrorBoundary.jsx"
import store from "./lib/store/index.js"
import { loadStorage } from "./lib/store/storage.js"
import { initAuth } from "./lib/auth.js"
import "./index.css"

void loadStorage().then(() => {
  initAuth()
})

const root = document.getElementById("root")
createRoot(root).render(
  <StrictMode>
    <Provider store={store}>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </Provider>
  </StrictMode>
)
