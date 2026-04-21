import { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen flex items-center justify-center bg-[#2d2a2e] text-[#fcfcfa]">
          <div className="text-center max-w-md px-6">
            <div className="text-4xl mb-4">Something went wrong</div>
            <p className="text-[#939293] mb-6">
              An unexpected error occurred. You can try reloading the app or going back.
            </p>
            {this.state.error && (
              <pre className="text-left text-xs bg-[#221f22] p-4 rounded mb-6 overflow-auto max-h-32 text-[#ff6188]">
                {this.state.error.message}
              </pre>
            )}
            <div className="flex gap-4 justify-center">
              <button
                onClick={this.handleReset}
                className="px-4 py-2 bg-[#403e41] hover:bg-[#5b595c] rounded transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={this.handleReload}
                className="px-4 py-2 bg-[#ffd866] text-[#2d2a2e] hover:bg-[#ffe699] rounded transition-colors font-medium"
              >
                Reload App
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
