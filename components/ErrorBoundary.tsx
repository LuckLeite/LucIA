
import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

/**
 * Standard Error Boundary component implementation.
 */
// Fix: Extending React.Component explicitly to ensure props and state types are correctly recognized by the TypeScript compiler.
class ErrorBoundary extends React.Component<Props, State> {
  // Explicitly declare state as a class property for better TypeScript support.
  public state: State = {
    hasError: false
  };

  constructor(props: Props) {
    super(props);
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // You can also log the error to an error reporting service
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    // Access state and props from the class instance using 'this'.
    // Destructuring state and props correctly from 'this'
    const { hasError, error } = this.state;
    const { children } = this.props;

    if (hasError) {
      // Fallback UI
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
                {error && (
                    <details className="mt-4 text-left text-sm text-gray-500 dark:text-gray-500 w-full max-w-lg mx-auto">
                        <summary className="cursor-pointer">Error Details</summary>
                        <pre className="mt-2 p-2 bg-gray-100 dark:bg-slate-800 rounded text-xs whitespace-pre-wrap break-all">
                            {error.toString()}
                        </pre>
                    </details>
                )}
            </div>
        </div>
      );
    }

    return children;
  }
}

export default ErrorBoundary;
