import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Clean up old push-sw.js service worker registration (one-time migration)
if ("serviceWorker" in navigator && !sessionStorage.getItem("sw_cleanup_done")) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    const oldPushSW = registrations.find((reg) => 
      reg.active?.scriptURL.includes("push-sw.js")
    );
    
    if (oldPushSW) {
      console.log("[SW Cleanup] Unregistering old push-sw.js...");
      oldPushSW.unregister().then(() => {
        console.log("[SW Cleanup] Old push-sw.js unregistered successfully");
        sessionStorage.setItem("sw_cleanup_done", "true");
        // Reload to activate the new unified service worker
        window.location.reload();
      });
    } else {
      sessionStorage.setItem("sw_cleanup_done", "true");
    }
  });
}

createRoot(document.getElementById("root")!).render(<App />);
