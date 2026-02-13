import { Component, type ErrorInfo, type ReactNode } from "react";

interface AppErrorBoundaryProps {
  children: ReactNode;
}

interface AppErrorBoundaryState {
  hasError: boolean;
  message?: string;
}

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error("[AppErrorBoundary] Unhandled UI error", { error, errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <section className="error-boundary" role="alert" aria-live="assertive">
          <h2>Something went wrong</h2>
          <p className="muted">The app hit an unexpected runtime error. You can safely reload the page.</p>
          {this.state.message ? <pre className="transcript">{this.state.message}</pre> : null}
          <button type="button" onClick={() => window.location.reload()}>Reload application</button>
        </section>
      );
    }

    return this.props.children;
  }
}
