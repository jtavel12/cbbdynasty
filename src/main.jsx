import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";

// Catches render/lifecycle errors anywhere below it so a crash shows a real
// message instead of a blank white tab — the save itself lives in
// localStorage and isn't touched by a render crash, so reloading is safe.
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    console.error("[CBB Dynasty crashed]", error, info);
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ minHeight: "100vh", background: "#14110f", color: "#e8ddc8", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Inter, sans-serif", padding: 24, textAlign: "center" }}>
          <div style={{ maxWidth: 420 }}>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>Something went wrong.</div>
            <div style={{ fontSize: 13, color: "#9a9085", marginBottom: 16 }}>Your save is untouched — it lives in this browser, not in the app itself. Reloading usually fixes it.</div>
            <button
              onClick={() => window.location.reload()}
              style={{ background: "#b5652f", color: "#14110f", border: "none", borderRadius: 6, padding: "10px 18px", fontWeight: 600, fontSize: 13, cursor: "pointer" }}
            >
              Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

/**
 * Drop-in replacement for the `window.storage` API that Claude's artifact
 * preview provides natively. Backed by the browser's localStorage so saves
 * persist on this device/browser. Swap this for a real backend (e.g. a
 * small API + database) if you want saves to follow a user across devices.
 */
if (!window.storage) {
  window.storage = {
    async get(key) {
      const raw = window.localStorage.getItem(key);
      return raw === null ? null : { key, value: raw, shared: false };
    },
    async set(key, value) {
      window.localStorage.setItem(key, value);
      return { key, value, shared: false };
    },
    async delete(key) {
      window.localStorage.removeItem(key);
      return { key, deleted: true, shared: false };
    },
    async list(prefix = "") {
      const keys = Object.keys(window.localStorage).filter((k) => k.startsWith(prefix));
      return { keys, prefix, shared: false };
    },
  };
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
