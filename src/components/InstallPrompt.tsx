import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

export const InstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener("beforeinstallprompt", handler);

    // Check if iOS and not in standalone mode
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isInStandaloneMode = ("standalone" in window.navigator) && (window.navigator as any)["standalone"];
    
    if (isIOS && !isInStandaloneMode) {
      const hasSeenIOSPrompt = localStorage.getItem("hasSeenIOSPrompt");
      if (!hasSeenIOSPrompt) {
        setShowIOSInstructions(true);
      }
    }

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  const dismissIOSPrompt = () => {
    setShowIOSInstructions(false);
    localStorage.setItem("hasSeenIOSPrompt", "true");
  };

  if (showIOSInstructions) {
    return (
      <div className="fixed bottom-20 md:bottom-4 left-4 right-4 bg-elevated border border-primary/50 rounded-lg p-4 shadow-lg z-40 animate-fade-in">
        <button
          onClick={dismissIOSPrompt}
          className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
        >
          <X className="w-4 h-4" />
        </button>
        <div className="flex items-start gap-3">
          <div className="text-2xl">🔥</div>
          <div className="flex-1 pr-4">
            <h3 className="font-semibold mb-2 text-foreground">Install Loop Level</h3>
            <ol className="text-sm text-muted-foreground space-y-1">
              <li>1. Tap the Share button <span className="inline-block">⬆️</span></li>
              <li>2. Scroll and tap "Add to Home Screen"</li>
              <li>3. Tap "Add" in the top right</li>
            </ol>
          </div>
        </div>
      </div>
    );
  }

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-20 md:bottom-4 left-4 right-4 bg-elevated border border-primary/50 rounded-lg p-4 shadow-lg z-40 animate-fade-in">
      <button
        onClick={() => setShowPrompt(false)}
        className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
      >
        <X className="w-4 h-4" />
      </button>
      <div className="flex items-start gap-3">
        <div className="text-2xl">🔥</div>
        <div className="flex-1">
          <h3 className="font-semibold mb-1 text-foreground">Install Loop Level</h3>
          <p className="text-sm text-muted-foreground mb-3">
            Get the app on your home screen for quick access!
          </p>
          <Button size="sm" onClick={handleInstall} className="w-full sm:w-auto">
            Install Now
          </Button>
        </div>
      </div>
    </div>
  );
};
