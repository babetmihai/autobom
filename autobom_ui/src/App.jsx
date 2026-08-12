import { useSelector } from "react-redux"
import { HashRouter, Switch, Route } from "react-router-dom"
import { Center, Loader } from "@mantine/core"
import CatalogPage from "./pages/CatalogPage.jsx"
import ProductPage from "./pages/ProductPage.jsx"
import SceneAnalyzerPage from "./pages/SceneAnalyzerPage.jsx"
import ListPage from "./pages/ListPage.jsx"
import LoginPage from "./pages/LoginPage.jsx"
import { selectAuthReady, selectAuthUid } from "./lib/auth.js"
import ModalDispatcher from "./components/ModalDispatcher.jsx"


export default function App() {
  const ready = useSelector(() => selectAuthReady())
  const uid = useSelector(() => selectAuthUid())

  if (!ready) {
    return (
      <Center h="100vh" bg="gray.1">
        <Loader color="brand" />
      </Center>
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
