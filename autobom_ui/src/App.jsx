import { useSelector } from "react-redux"
import { HashRouter, Switch, Route } from "react-router-dom"
import CatalogPage from "./pages/CatalogPage.jsx"
import ProductPage from "./pages/ProductPage.jsx"
import SceneAnalyzerPage from "./pages/SceneAnalyzerPage.jsx"
import ListPage from "./pages/ListPage.jsx"
import LoginPage from "./pages/LoginPage.jsx"
import { selectAuthReady, selectAuthUid } from "./lib/auth.js"
import { LoadingSpinnerIcon } from "./components/Icons.jsx"
import ModalDispatcher from "./components/ModalDispatcher.jsx"


export default function App() {
  const ready = useSelector(() => selectAuthReady())
  const uid = useSelector(() => selectAuthUid())

  if (!ready) {
    return (
      <div className="flex h-screen items-center justify-center bg-neutral-100 text-neutral-600">
        <LoadingSpinnerIcon className="h-6 w-6 animate-spin" />
      </div>
    )
  }

  if (!uid) {
    return <LoginPage />
  }

  return (
    <HashRouter>
      <Switch>
        <Route exact path="/" component={CatalogPage} />
        <Route exact path="/product/:productId" component={ProductPage} />
        <Route exact path="/list" component={ListPage} />
        <Route exact path="/scene-analyzer" component={SceneAnalyzerPage} />
        <Route path="/scene-analyzer/:sceneId" component={SceneAnalyzerPage} />
      </Switch>
      <ModalDispatcher />
    </HashRouter>
  )
}
