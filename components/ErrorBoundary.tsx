import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error('[KorsIQ ErrorBoundary]', error?.message || error, info?.componentStack?.slice(0, 300));
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800 rounded-lg p-6 space-y-4 text-center">
            <h1 className="text-lg font-bold text-[#111827] dark:text-white">
              Something went wrong
            </h1>
            <p className="text-sm text-[#5B6472] dark:text-slate-400">
              KorsIQ hit an unexpected display error. Your saved work is safe — reload to continue.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-4 py-2.5 bg-[#2563EB] hover:bg-[#1746A2] text-white rounded-lg text-sm font-semibold min-h-[44px] cursor-pointer"
            >
              Reload KorsIQ
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
