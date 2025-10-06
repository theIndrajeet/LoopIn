import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Register push notification service worker
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/push-sw.js").catch((error) => {
      console.error("Push SW registration failed:", error);
    });
  });
}

createRoot(document.getElementById("root")!).render(<App />);
