import { Component } from "react"
import { Alert, Button, Code, Text } from "@mantine/core"
import i18n from "./lib/i18n/index.js"

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, errorInfo) {
    console.error("[Autobom]", error, errorInfo)
    this.setState({ errorInfo })
  }

  handleReload = () => {
    window.location.reload()
  }

  render() {
    const { error, errorInfo } = this.state
    if (!error) {
      return this.props.children
    }

    const stack = typeof error.stack === "string" ? error.stack : ""

    return (
      <Alert
        color="red"
        m="md"
        maw={48 * 16}
        title={i18n.t("something_went_wrong")}
        role="alert"
      >
        <Text size="sm" c="dimmed" mb="sm">
          {i18n.t("react_error_details")}
        </Text>
        <Code block mb="sm">
          {error.message || String(error)}
        </Code>
        {stack &&
          <details className="mb-3">
            <summary className="cursor-pointer font-semibold text-gray-700">{i18n.t("stack_trace")}</summary>
            <Code block mt="xs" className="text-[0.6875rem]">
              {stack}
            </Code>
          </details>
        }
        {errorInfo?.componentStack &&
          <details className="mb-3">
            <summary className="cursor-pointer font-semibold text-gray-700">{i18n.t("component_stack")}</summary>
            <Code block mt="xs" className="text-[0.6875rem]">
              {errorInfo.componentStack}
            </Code>
          </details>
        }
        <Button variant="default" mt="xs" onClick={this.handleReload}>
          {i18n.t("reload")}
        </Button>
      </Alert>
    )
  }
}
