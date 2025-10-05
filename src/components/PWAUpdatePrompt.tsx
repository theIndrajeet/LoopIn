import { useEffect } from "react";
import { Workbox } from "workbox-window";
import { toast } from "sonner";

export const PWAUpdatePrompt = () => {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      const wb = new Workbox("/sw.js");

      wb.addEventListener("waiting", () => {
        toast("New version available!", {
          description: "Click update to get the latest features",
          action: {
            label: "Update Now",
            onClick: () => {
              wb.addEventListener("controlling", () => {
                window.location.reload();
              });
              wb.messageSkipWaiting();
            },
          },
          duration: Infinity,
        });
      });

      wb.register();
    }
  }, []);

  return null;
};
