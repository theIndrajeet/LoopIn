import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
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
import { Bell } from "lucide-react";
import { toast } from "sonner";

const VAPID_PUBLIC_KEY = "BFIC9A-yKEfdoJeTWlBjOSZsLpEX6MQoPt3ygl1wfaEEFn6yKMG5WmkpwLnkSpZ-NSulf2wCJ7XCzRQQZMjqspU";

export const FirstTimeNotificationPrompt = () => {
  const [showPrompt, setShowPrompt] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkIfShouldShowPrompt();
  }, []);

  const checkIfShouldShowPrompt = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: prefs } = await supabase
        .from("user_preferences")
        .select("dismissed_progressive_prompts")
        .eq("user_id", user.id)
        .single();

      const hasBeenPrompted = prefs?.dismissed_progressive_prompts?.includes("notification_setup");
      
      if ('serviceWorker' in navigator && 'PushManager' in window) {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        
        if (!hasBeenPrompted && !subscription && 'Notification' in window) {
          setTimeout(() => setShowPrompt(true), 2000);
        }
      }
    } catch (error) {
      console.error("Error checking notification prompt status:", error);
    }
  };

  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const handleEnable = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        toast.error("Notification permission denied");
        markAsPrompted();
        setShowPrompt(false);
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      const subscriptionJson = subscription.toJSON();
      await supabase.from("push_subscriptions").insert({
        user_id: user.id,
        endpoint: subscriptionJson.endpoint!,
        p256dh: subscriptionJson.keys!.p256dh,
        auth: subscriptionJson.keys!.auth,
        user_agent: navigator.userAgent,
      });

      toast.success("Notifications enabled! 🔔");
      markAsPrompted();
      setShowPrompt(false);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to enable notifications");
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = async () => {
    markAsPrompted();
    setShowPrompt(false);
    toast.info("You can enable notifications anytime in Alerts");
  };

  const markAsPrompted = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: prefs } = await supabase
        .from("user_preferences")
        .select("dismissed_progressive_prompts")
        .eq("user_id", user.id)
        .single();

      const currentPrompts = prefs?.dismissed_progressive_prompts || [];
      await supabase
        .from("user_preferences")
        .update({ dismissed_progressive_prompts: [...currentPrompts, "notification_setup"] })
        .eq("user_id", user.id);
    } catch (error) {
      console.error("Error:", error);
    }
  };

  return (
    <AlertDialog open={showPrompt}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 rounded-full bg-primary/10">
            <Bell className="w-6 h-6 text-primary" />
          </div>
          <AlertDialogTitle className="text-center">
            Stay on track with reminders
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center">
            Get notified about:
            <ul className="mt-3 space-y-2 text-left pl-6">
              <li className="flex items-center gap-2">
                <span className="text-primary">✓</span> Daily habit reminders
              </li>
              <li className="flex items-center gap-2">
                <span className="text-primary">✓</span> Streak warnings
              </li>
              <li className="flex items-center gap-2">
                <span className="text-primary">✓</span> Friend activity
              </li>
              <li className="flex items-center gap-2">
                <span className="text-primary">✓</span> Achievements
              </li>
            </ul>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleSkip} disabled={loading}>
            Maybe Later
          </AlertDialogCancel>
          <AlertDialogAction onClick={handleEnable} disabled={loading}>
            {loading ? "Enabling..." : "Enable Notifications"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
