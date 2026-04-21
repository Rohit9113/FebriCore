"use client";
// src/components/ErrorBoundary.jsx
//
// ✅ FIX 27: React Error Boundary
//
// Problem pehle:
//   Agar koi bhi section component (OrdersSection, IncomeSection, etc.)
//   runtime error throw kare toh poora dashboard blank ho jaata tha
//   User ko kuch nahi dikhta — na error, na koi option
//
// Solution:
//   ErrorBoundary class component — React ka official pattern
//   - Sirf wahi section crash dikhta hai jo actually toot a hai
//   - Baaki sab sections normal kaam karte rehte hain
//   - "Dobara Try Karo" button se sirf wahi component reset hota hai
//   - Error details dev mode mein dikhte hain
//
// Usage:
//   <ErrorBoundary label="Income Section">
//     <IncomeSection />
//   </ErrorBoundary>

import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError:   false,
      error:      null,
      errorInfo:  null,
      retryCount: 0,
    };
  }

  // ── Error capture ─────────────────────────────────────────────
  static getDerivedStateFromError(error) {
    // Render phase mein error aaya — fallback UI dikhao
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Error details log karo — production mein Sentry etc. yahan hook hoga
    console.error(
      `[ErrorBoundary] "${this.props.label || "Component"}" crash hua:`,
      error,
      errorInfo
    );
    this.setState({ errorInfo });
  }

  // ── Reset — sirf is component ko dobara try karo ─────────────
  handleRetry = () => {
    this.setState((prev) => ({
      hasError:   false,
      error:      null,
      errorInfo:  null,
      retryCount: prev.retryCount + 1,
    }));
  };

  render() {
    if (!this.state.hasError) {
      // ✅ Normal render — key se force remount on retry
      return (
        <React.Fragment key={this.state.retryCount}>
          {this.props.children}
        </React.Fragment>
      );
    }

    // ── Fallback UI ───────────────────────────────────────────────
    const label   = this.props.label || "Yeh section";
    const isDev   = process.env.NODE_ENV === "development";
    const errMsg  = this.state.error?.message || "Unknown error";
    const errStack= this.state.errorInfo?.componentStack || "";

    return (
      <div
        className="rounded-2xl p-6 flex flex-col items-center text-center"
        style={{
          background: "rgba(239,68,68,0.04)",
          border:     "1px solid rgba(239,68,68,0.18)",
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        {/* Icon */}
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl mb-4 flex-shrink-0"
          style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}
        >
          ⚠️
        </div>

        {/* Title */}
        <p className="text-white font-black text-base mb-1">
          {label} crash ho gaya
        </p>
        <p className="text-sm mb-5" style={{ color: "#6b7a99" }}>
          Kuch unexpected error aaya — baaki dashboard theek hai
        </p>

        {/* Dev mode — error details */}
        {isDev && (
          <div
            className="w-full rounded-xl p-3 mb-5 text-left overflow-auto max-h-40"
            style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(239,68,68,0.15)" }}
          >
            <p className="text-red-400 text-xs font-bold mb-1 font-mono">{errMsg}</p>
            {errStack && (
              <pre className="text-[10px] text-gray-600 whitespace-pre-wrap leading-relaxed font-mono">
                {errStack.trim()}
              </pre>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          {/* Retry — sirf is section ko reset karo */}
          <button
            onClick={this.handleRetry}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all"
            style={{
              background: "rgba(59,130,246,0.12)",
              border:     "1px solid rgba(59,130,246,0.25)",
              color:      "#3b82f6",
            }}
          >
            🔄 Dobara Try Karo
          </button>

          {/* Full page reload — last resort */}
          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all"
            style={{
              background: "rgba(255,255,255,0.04)",
              border:     "1px solid rgba(255,255,255,0.08)",
              color:      "#4a5580",
            }}
          >
            ↺ Page Reload
          </button>
        </div>
      </div>
    );
  }
}