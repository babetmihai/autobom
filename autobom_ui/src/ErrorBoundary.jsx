import { Component } from "react"

const PRE_BLOCK_MSG =
  "mb-3 overflow-x-auto whitespace-pre-wrap break-words rounded-md border border-red-200 bg-white p-3 font-mono text-xs"

const PRE_BLOCK_STACK =
  "mt-2 overflow-x-auto whitespace-pre-wrap rounded-md border border-red-200 bg-white p-3 font-mono text-[0.6875rem]"

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
      <div
        className="m-3 max-w-3xl rounded-lg border border-red-300 bg-red-50 p-4 text-[0.8125rem]"
        role="alert"
      >
        <h1 className="mb-2 mt-0 text-base font-semibold text-red-900">This panel hit a React error</h1>
        <p className="mb-3 mt-0 text-neutral-600">
          SketchUp 2021’s embedded browser is strict; Firebase and other libraries can fail here. Details
          below.
        </p>
        <pre className={PRE_BLOCK_MSG}>
          {error.message || String(error)}
        </pre>
        {stack &&
          <details className="mb-3" open>
            <summary className="cursor-pointer font-semibold text-neutral-700">Stack trace</summary>
            <pre className={PRE_BLOCK_STACK}>
              {stack}
            </pre>
          </details>
        }
        {errorInfo?.componentStack &&
          <details className="mb-3">
            <summary className="cursor-pointer font-semibold text-neutral-700">Component stack</summary>
            <pre className={PRE_BLOCK_STACK}>
              {errorInfo.componentStack}
            </pre>
          </details>
        }
        <button
          type="button"
          className="ab-btn-neutral mt-1"
          onClick={this.handleReload}
        >
          Reload panel
        </button>
      </div>
    )
  }
}
