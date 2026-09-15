import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";

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
    <App />
  </React.StrictMode>
);
