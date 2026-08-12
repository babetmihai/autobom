import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { Provider } from "react-redux"
import { MantineProvider } from "@mantine/core"
import { Notifications } from "@mantine/notifications"
import App from "./App.jsx"
import { ErrorBoundary } from "./ErrorBoundary.jsx"
import store from "./lib/store/index.js"
import { loadStorage } from "./lib/store/storage.js"
import { initAuth } from "./lib/auth.js"
import theme from "./theme.js"
import "./index.css"

void loadStorage().then(() => {
  initAuth()
})

const root = document.getElementById("root")
createRoot(root).render(
  <StrictMode>
    <Provider store={store}>
      <MantineProvider theme={theme} defaultColorScheme="light">
        <Notifications position="bottom-right" zIndex={400} />
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </MantineProvider>
    </Provider>
  </StrictMode>
)
