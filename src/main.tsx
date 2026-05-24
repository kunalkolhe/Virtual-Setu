import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Global safety net: Supabase SDK and other third-party libraries sometimes
// reject internal Promises with plain objects instead of Error instances.
// This prevents those from surfacing as uncaught exceptions that crash the app.
window.addEventListener("unhandledrejection", (event) => {
  const reason = event.reason;
  if (!(reason instanceof Error)) {
    // Silently absorb non-Error rejections (e.g. Supabase auth token refresh)
    event.preventDefault();
    if (reason !== undefined && reason !== null) {
      console.warn("[unhandledrejection] Non-Error rejection suppressed:", reason);
    }
  }
});

createRoot(document.getElementById("root")!).render(<App />);
