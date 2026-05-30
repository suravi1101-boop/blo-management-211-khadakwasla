import { InternetIdentityProvider } from "@caffeineai/core-infrastructure";
import { QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { ActorProvider } from "./lib/actorContext";
import { queryClient } from "./lib/queryClient";

class GlobalErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Global ErrorBoundary caught:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-6">
          <div className="max-w-md w-full text-center space-y-4">
            <p className="text-red-600 font-semibold text-lg">
              माफ करा, एक त्रुटी आली.
            </p>
            <p className="text-muted-foreground text-sm">
              कृपया पान पुन्हा लोड करा.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
              पान पुन्हा लोड करा
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <GlobalErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <ActorProvider>
        <InternetIdentityProvider>
          <App />
        </InternetIdentityProvider>
      </ActorProvider>
    </QueryClientProvider>
  </GlobalErrorBoundary>,
);
