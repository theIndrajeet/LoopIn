import { useEffect, useState } from "react";
import { Workbox } from "workbox-window";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const PWAUpdatePrompt = () => {
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);
  const [workboxInstance, setWorkboxInstance] = useState<Workbox | null>(null);

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
        console.log("[PWA] New update waiting, showing alert dialog");
        setWorkboxInstance(wb);
        setShowUpdateDialog(true);
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

  const handleUpdate = () => {
    if (workboxInstance) {
      console.log("[PWA] User clicked update, activating new version");
      workboxInstance.addEventListener("controlling", () => {
        console.log("[PWA] New service worker activated, reloading page");
        window.location.reload();
      });
      workboxInstance.messageSkipWaiting();
    }
    setShowUpdateDialog(false);
  };

  return (
    <AlertDialog open={showUpdateDialog} onOpenChange={setShowUpdateDialog}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>New Version Available! 🎉</AlertDialogTitle>
          <AlertDialogDescription>
            A new version of Loop Level is ready. Update now to get the latest features and improvements.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Later</AlertDialogCancel>
          <AlertDialogAction onClick={handleUpdate}>
            Update Now
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
