import { useEffect } from "react";
import { Workbox } from "workbox-window";
import { toast } from "sonner";

export const PWAUpdatePrompt = () => {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      const wb = new Workbox("/sw.js");

      console.log("[PWA] Service Worker initializing...");

      // When a new service worker is installed
      wb.addEventListener("installed", (event) => {
        if (!event.isUpdate) {
          console.log("[PWA] Service worker installed for the first time");
        } else {
          console.log("[PWA] New service worker installed, update available");
        }
      });

      // When a new service worker is waiting to activate
      wb.addEventListener("waiting", () => {
        console.log("[PWA] New update waiting, showing prompt");
        toast("New version available!", {
          description: "Click update to get the latest features",
          action: {
            label: "Update Now",
            onClick: () => {
              console.log("[PWA] User clicked update, activating new version");
              wb.addEventListener("controlling", () => {
                console.log("[PWA] New service worker activated, reloading page");
                window.location.reload();
              });
              wb.messageSkipWaiting();
            },
          },
          duration: Infinity,
        });
      });

      // When the service worker has been updated
      wb.addEventListener("controlling", () => {
        console.log("[PWA] New service worker now controlling the page");
      });

      // Check for updates periodically (every hour)
      setInterval(() => {
        console.log("[PWA] Checking for updates...");
        wb.update();
      }, 60 * 60 * 1000);

      wb.register()
        .then((registration) => {
          console.log("[PWA] Service worker registered successfully", registration);
        })
        .catch((error) => {
          console.error("[PWA] Service worker registration failed:", error);
        });
    } else {
      console.log("[PWA] Service workers not supported in this browser");
    }
  }, []);

  return null;
};
