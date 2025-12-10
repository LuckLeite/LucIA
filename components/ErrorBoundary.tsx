import React, { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-slate-900 text-gray-800 dark:text-gray-200 p-4">
            <div className="text-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mx-auto text-red-500">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                <h1 className="mt-4 text-2xl font-bold">Oops! Something went wrong.</h1>
                <p className="mt-2 text-gray-600 dark:text-gray-400">The application encountered a problem and could not continue.</p>
                <p className="mt-2 text-gray-600 dark:text-gray-400">Please try reloading the page.</p>
                <button 
                    onClick={() => window.location.reload()}
                    className="mt-6 px-4 py-2 bg-primary-600 text-white font-semibold rounded-md hover:bg-primary-700"
                >
                    Reload
                </button>
                {this.state.error && (
                    <details className="mt-4 text-left text-sm text-gray-500 dark:text-gray-500 w-full max-w-lg mx-auto">
                        <summary className="cursor-pointer">Error Details</summary>
                        <pre className="mt-2 p-2 bg-gray-100 dark:bg-slate-800 rounded text-xs whitespace-pre-wrap break-all">
                            {this.state.error.toString()}
                        </pre>
                    </details>
                )}
            </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;