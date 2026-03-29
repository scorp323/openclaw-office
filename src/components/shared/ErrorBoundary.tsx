import { Component, type ReactNode } from "react";
import { AlertTriangle, ChevronDown, ChevronUp, Home, RotateCcw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  stackExpanded: boolean;
}

function reportError(error: Error) {
  try {
    const payload = {
      message: error.message,
      stack: error.stack ?? "",
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent,
    };
    void fetch("/mc-api/errors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).catch(() => {});
  } catch {
    // silent — error reporting should never throw
  }
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null, stackExpanded: false };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    reportError(error);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      const { error, stackExpanded } = this.state;
      const stack = error?.stack ?? "";

      return (
        <div className="flex h-full min-h-[200px] flex-col items-center justify-center p-6 text-center">
          <div className="w-full max-w-lg">
            <AlertTriangle className="mx-auto mb-3 h-10 w-10 text-red-400" strokeWidth={1.5} />
            <h3 className="mb-1 text-base font-semibold text-gray-900 dark:text-gray-100">
              Something went wrong
            </h3>
            <p className="mb-4 text-sm text-red-500 dark:text-red-400">
              {error?.message || "Unknown error"}
            </p>

            {stack && (
              <div className="mb-4 text-left">
                <button
                  type="button"
                  onClick={() => this.setState({ stackExpanded: !stackExpanded })}
                  className="mb-1 flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                >
                  {stackExpanded ? (
                    <ChevronUp className="h-3 w-3" />
                  ) : (
                    <ChevronDown className="h-3 w-3" />
                  )}
                  Stack trace
                </button>
                {stackExpanded && (
                  <pre className="max-h-48 overflow-auto rounded-lg border border-gray-200 bg-gray-50 p-3 text-left font-mono text-[11px] leading-relaxed text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400">
                    {stack}
                  </pre>
                )}
              </div>
            )}

            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => this.setState({ hasError: false, error: null, stackExpanded: false })}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Try Again
              </button>
              <a
                href="/"
                className="inline-flex items-center gap-1.5 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200"
              >
                <Home className="h-3.5 w-3.5" />
                Go Home
              </a>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
