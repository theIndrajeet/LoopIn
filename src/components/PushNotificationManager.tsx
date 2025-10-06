import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Bell, BellOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Use the VAPID public key from your environment or the one provided
const VAPID_PUBLIC_KEY = "BEB9jLoaJVHPAoui2Y99nSBfSCQBCuu6Ui2rwtJb_SfeJ8uK8DIxucPxtc-s69RwanEILw9Xz-nJ9dqG4OUOA4g";

export const PushNotificationManager = () => {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if ("Notification" in window) {
      setPermission(Notification.permission);
      checkSubscription();
    }
  }, []);

  const checkSubscription = async () => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
    } catch (error) {
      console.error("Error checking subscription:", error);
    }
  };

  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, "+")
      .replace(/_/g, "/");

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const subscribeToPush = async () => {
    setIsLoading(true);

    try {
      // Request notification permission
      const permissionResult = await Notification.requestPermission();
      setPermission(permissionResult);

      if (permissionResult !== "granted") {
        toast.error("Notification permission denied");
        setIsLoading(false);
        return;
      }

      // Get service worker registration
      const registration = await navigator.serviceWorker.ready;

      // Subscribe to push notifications
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      // Get subscription details
      const subscriptionJson = subscription.toJSON();

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error("User not authenticated");
        setIsLoading(false);
        return;
      }

      // Save subscription to database
      const { error } = await supabase.from("push_subscriptions").insert({
        user_id: user.id,
        endpoint: subscriptionJson.endpoint!,
        p256dh: subscriptionJson.keys!.p256dh,
        auth: subscriptionJson.keys!.auth,
        user_agent: navigator.userAgent,
      });

      if (error) {
        console.error("Error saving subscription:", error);
        toast.error("Failed to save notification subscription");
      } else {
        setIsSubscribed(true);
        toast.success("Push notifications enabled! 🔔");
      }
    } catch (error) {
      console.error("Error subscribing to push:", error);
      toast.error("Failed to enable push notifications");
    } finally {
      setIsLoading(false);
    }
  };

  const unsubscribeFromPush = async () => {
    setIsLoading(true);

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();

        // Remove from database
        const { error } = await supabase
          .from("push_subscriptions")
          .delete()
          .eq("endpoint", subscription.endpoint);

        if (error) {
          console.error("Error removing subscription:", error);
        }

        setIsSubscribed(false);
        toast.success("Push notifications disabled");
      }
    } catch (error) {
      console.error("Error unsubscribing:", error);
      toast.error("Failed to disable push notifications");
    } finally {
      setIsLoading(false);
    }
  };

  const sendTestNotification = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error("User not authenticated");
        return;
      }

      // Test notification directly through service worker (bypasses backend)
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        
        await registration.showNotification("🎉 Test Notification", {
          body: "Your push notifications are working perfectly!",
          icon: "/icon-192.png",
          badge: "/icon-192.png",
          tag: "test-notification",
          requireInteraction: false,
          data: {
            type: 'test',
            action_url: '/dashboard'
          }
        });
        
        toast.success("Test notification sent! 🔔");
        console.log("✅ Test notification sent through service worker");
      } else {
        toast.error("Service worker not available");
      }

      // TODO: Uncomment this when backend function is fixed
      /*
      const { error } = await supabase.functions.invoke("send-push-notification", {
        body: {
          userIds: [user.id],
          notification: {
            title: "Test Notification 🎉",
            body: "Your push notifications are working perfectly!",
            icon: "/icon-192.png",
            badge: "/icon-192.png",
            tag: "test-notification",
          },
        },
      });

      if (error) {
        console.error("Error sending test notification:", error);
        toast.error("Failed to send test notification");
      } else {
        toast.success("Test notification sent!");
      }
      */
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to send test notification");
    }
  };

  if (!("Notification" in window)) {
    return null;
  }

  return (
    <Card className="p-4">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          {isSubscribed ? (
            <Bell className="h-5 w-5 text-primary" />
          ) : (
            <BellOff className="h-5 w-5 text-muted-foreground" />
          )}
          <div className="flex-1">
            <h3 className="font-semibold">Push Notifications</h3>
            <p className="text-sm text-muted-foreground">
              {isSubscribed
                ? "You'll receive notifications about your habits and streaks"
                : "Enable notifications to stay on track"}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          {!isSubscribed ? (
            <Button
              onClick={subscribeToPush}
              disabled={isLoading || permission === "denied"}
              className="w-full"
            >
              {isLoading ? "Enabling..." : "Enable Notifications"}
            </Button>
          ) : (
            <>
              <Button
                onClick={unsubscribeFromPush}
                variant="outline"
                disabled={isLoading}
                className="flex-1"
              >
                {isLoading ? "Disabling..." : "Disable"}
              </Button>
              <Button
                onClick={sendTestNotification}
                variant="secondary"
                className="flex-1"
              >
                Test
              </Button>
            </>
          )}
        </div>

        {permission === "denied" && (
          <p className="text-xs text-destructive">
            Notifications are blocked. Please enable them in your browser settings.
          </p>
        )}
      </div>
    </Card>
  );
};
