import { Component, type ErrorInfo, type ReactNode } from 'react';

interface State {
  error: boolean;
}

/** Catches unexpected rendering errors. Never displays stack traces or financial data. */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: false };

  static getDerivedStateFromError(): State {
    return { error: true };
  }

  componentDidCatch(error: Error, _info: ErrorInfo): void {
    // Only the error type is logged — never records or amounts.
    console.error('SpendWise UI error:', error.name);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="grid min-h-dvh place-items-center px-6 text-center">
        <div className="max-w-sm">
          <h1 className="text-xl font-bold">Something went wrong on this screen</h1>
          <p className="mt-2 text-fg-muted">Your saved records are not affected. Reload SpendWise to continue.</p>
          <div className="mt-5 flex justify-center gap-2">
            <button className="h-11 rounded-xl bg-emerald-500 px-5 font-semibold text-[#04140c]" onClick={() => window.location.reload()}>
              Reload
            </button>
            <button
              className="h-11 rounded-xl border border-line px-5 font-semibold"
              onClick={() => {
                window.location.hash = '#/';
                this.setState({ error: false });
              }}
            >
              Go to Overview
            </button>
          </div>
        </div>
      </div>
    );
  }
}
