import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Bell, BellOff, Check, Send, Loader2, Shield } from "lucide-react";
import { toast } from "sonner";
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

const VAPID_PUBLIC_KEY = "BFIC9A-yKEfdoJeTWlBjOSZsLpEX6MQoPt3ygl1wfaEEFn6yKMG5WmkpwLnkSpZ-NSulf2wCJ7XCzRQQZMjqspU";
const ADMIN_EMAIL = "heyjeetttt@gmail.com";

export const NotificationSettings = () => {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isAdmin, setIsAdmin] = useState(false);
  const [settings, setSettings] = useState({
    habitReminders: true,
    streakWarnings: true,
    friendRequests: true,
    friendActivity: true,
    levelUp: true,
    streakMilestones: true,
  });
  
  // Admin broadcast state
  const [broadcastTitle, setBroadcastTitle] = useState("");
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [broadcastUrl, setBroadcastUrl] = useState("/dashboard");
  const [broadcastLoading, setBroadcastLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [broadcastStats, setBroadcastStats] = useState<{ total: number; sent: number } | null>(null);

  useEffect(() => {
    checkStatus();
    checkAdminStatus();
  }, []);

  const checkAdminStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user && user.email === ADMIN_EMAIL) {
        setIsAdmin(true);
        console.log("✅ Admin access granted for:", user.email);
      }
    } catch (error) {
      console.error("Error checking admin status:", error);
    }
  };

  const checkStatus = async () => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }

    if ('serviceWorker' in navigator && 'PushManager' in window) {
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        setIsSubscribed(!!subscription);
      } catch (error) {
        console.error("Error checking subscription:", error);
      }
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

  const handleEnableNotifications = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("User not authenticated");
        return;
      }

      const permissionResult = await Notification.requestPermission();
      setPermission(permissionResult);

      if (permissionResult !== "granted") {
        toast.error("Notification permission denied");
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      const subscriptionJson = subscription.toJSON();
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
        await sendTestNotification();
      }
    } catch (error) {
      console.error("Error enabling notifications:", error);
      toast.error("Failed to enable push notifications");
    } finally {
      setLoading(false);
    }
  };

  const handleDisableNotifications = async () => {
    setLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();

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
      setLoading(false);
    }
  };

  const sendTestNotification = async () => {
    try {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        await registration.showNotification("🎉 Notifications Enabled!", {
          body: "You're all set! You'll receive updates about your habits and streaks.",
          icon: "/icon-192.png",
          badge: "/icon-192.png",
          tag: "welcome-notification",
        });
      }
    } catch (error) {
      console.error("Error sending test notification:", error);
    }
  };

  const sendBroadcastNotification = async () => {
    if (!broadcastTitle.trim() || !broadcastMessage.trim()) {
      toast.error("Title and message are required");
      return;
    }

    setBroadcastLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-bulk-notification", {
        body: {
          notification: {
            title: broadcastTitle.trim(),
            body: broadcastMessage.trim(),
            icon: "/icon-192.png",
            badge: "/icon-192.png",
            tag: `admin-${Date.now()}`,
            data: {
              type: 'admin_announcement',
              action_url: broadcastUrl || '/dashboard'
            }
          },
        },
      });

      if (error) throw error;

      setBroadcastStats(data);
      toast.success(`✅ Broadcast sent to ${data.sent} users!`);
      
      // Reset form
      setBroadcastTitle("");
      setBroadcastMessage("");
      setBroadcastUrl("/dashboard");
      setShowConfirm(false);
    } catch (error: any) {
      console.error("Error sending bulk notification:", error);
      toast.error(error.message || "Failed to send notification");
    } finally {
      setBroadcastLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Admin Panel - Only visible to admin */}
      {isAdmin && (
        <>
          <Card className="border-destructive/50 bg-destructive/5">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-destructive" />
                <CardTitle className="text-destructive">Admin: Broadcast Notification</CardTitle>
              </div>
              <CardDescription>
                Send a push notification to all users who have notifications enabled
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="admin-title">Notification Title *</Label>
                <Input
                  id="admin-title"
                  placeholder="e.g., New Feature Released! 🎉"
                  value={broadcastTitle}
                  onChange={(e) => setBroadcastTitle(e.target.value)}
                  maxLength={50}
                />
                <p className="text-xs text-muted-foreground">{broadcastTitle.length}/50 characters</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="admin-message">Message *</Label>
                <Textarea
                  id="admin-message"
                  placeholder="e.g., Check out our new AI assistant feature to get personalized habit suggestions!"
                  value={broadcastMessage}
                  onChange={(e) => setBroadcastMessage(e.target.value)}
                  rows={4}
                  maxLength={200}
                />
                <p className="text-xs text-muted-foreground">{broadcastMessage.length}/200 characters</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="admin-url">Action URL (optional)</Label>
                <Input
                  id="admin-url"
                  placeholder="/dashboard"
                  value={broadcastUrl}
                  onChange={(e) => setBroadcastUrl(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Where users will be redirected when they click the notification
                </p>
              </div>

              {broadcastStats && (
                <div className="p-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
                  <p className="text-sm font-medium text-green-700 dark:text-green-300">
                    Last broadcast: Sent to {broadcastStats.sent} out of {broadcastStats.total} users
                  </p>
                </div>
              )}

              <Button
                onClick={() => setShowConfirm(true)}
                disabled={broadcastLoading || !broadcastTitle.trim() || !broadcastMessage.trim()}
                className="w-full"
                variant="destructive"
              >
                {broadcastLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending to all users...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Send to All Users ({broadcastStats?.total || '...'} users)
                  </>
                )}
              </Button>

              <p className="text-xs text-muted-foreground text-center">
                ⚠️ This will send a push notification to all users with notifications enabled
              </p>
            </CardContent>
          </Card>

          <Separator className="my-6" />
        </>
      )}

      {/* Regular User Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isSubscribed ? (
                <div className="p-2 rounded-full bg-primary/10">
                  <Bell className="h-5 w-5 text-primary" />
                </div>
              ) : (
                <div className="p-2 rounded-full bg-muted">
                  <BellOff className="h-5 w-5 text-muted-foreground" />
                </div>
              )}
              <div>
                <CardTitle className="text-lg">Push Notifications</CardTitle>
                <CardDescription>
                  {isSubscribed 
                    ? "You're receiving notifications" 
                    : "Enable to stay updated"}
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {permission === "denied" && (
            <div className="p-3 mb-4 rounded-lg bg-destructive/10 border border-destructive/20">
              <p className="text-sm text-destructive">
                Notifications are blocked. Please enable them in your browser settings.
              </p>
            </div>
          )}

          {!isSubscribed ? (
            <Button
              onClick={handleEnableNotifications}
              disabled={loading || permission === "denied"}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Enabling...
                </>
              ) : (
                <>
                  <Bell className="w-4 h-4 mr-2" />
                  Enable Notifications
                </>
              )}
            </Button>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
                <Check className="h-4 w-4 text-primary" />
                <span className="text-sm text-primary font-medium">
                  Notifications are active
                </span>
              </div>
              <Button
                onClick={handleDisableNotifications}
                variant="outline"
                disabled={loading}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Disabling...
                  </>
                ) : (
                  <>
                    <BellOff className="w-4 h-4 mr-2" />
                    Disable Notifications
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {isSubscribed && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Notification Types</CardTitle>
            <CardDescription>
              Choose what you want to be notified about
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="habit-reminders" className="text-base">
                  Habit Reminders
                </Label>
                <p className="text-sm text-muted-foreground">
                  Daily reminders to complete your habits
                </p>
              </div>
              <Switch
                id="habit-reminders"
                checked={settings.habitReminders}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, habitReminders: checked })
                }
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="streak-warnings" className="text-base">
                  Streak Warnings
                </Label>
                <p className="text-sm text-muted-foreground">
                  Alerts when your streak is at risk
                </p>
              </div>
              <Switch
                id="streak-warnings"
                checked={settings.streakWarnings}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, streakWarnings: checked })
                }
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="friend-requests" className="text-base">
                  Friend Requests
                </Label>
                <p className="text-sm text-muted-foreground">
                  New friend requests and accepts
                </p>
              </div>
              <Switch
                id="friend-requests"
                checked={settings.friendRequests}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, friendRequests: checked })
                }
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="friend-activity" className="text-base">
                  Friend Activity
                </Label>
                <p className="text-sm text-muted-foreground">
                  When friends complete habits
                </p>
              </div>
              <Switch
                id="friend-activity"
                checked={settings.friendActivity}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, friendActivity: checked })
                }
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="level-up" className="text-base">
                  Level Up
                </Label>
                <p className="text-sm text-muted-foreground">
                  XP milestones and level achievements
                </p>
              </div>
              <Switch
                id="level-up"
                checked={settings.levelUp}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, levelUp: checked })
                }
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="streak-milestones" className="text-base">
                  Streak Milestones
                </Label>
                <p className="text-sm text-muted-foreground">
                  Celebrate streak achievements
                </p>
              </div>
              <Switch
                id="streak-milestones"
                checked={settings.streakMilestones}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, streakMilestones: checked })
                }
              />
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">
            <strong>Note:</strong> Notification preferences will be saved and used when sending notifications from the server. Make sure your browser allows notifications from this site.
          </p>
        </CardContent>
      </Card>

      {/* Admin Confirmation Dialog */}
      {isAdmin && (
        <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>⚠️ Confirm Broadcast to All Users</AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div>
                  <p>You're about to send this notification to <strong>ALL users</strong> who have notifications enabled. This action cannot be undone.</p>
                  <div className="mt-4 p-3 bg-muted rounded-lg space-y-2">
                    <p className="font-medium">📱 {broadcastTitle}</p>
                    <p className="text-sm">{broadcastMessage}</p>
                    <p className="text-xs text-muted-foreground">🔗 Action: {broadcastUrl}</p>
                  </div>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={sendBroadcastNotification} 
                className="bg-destructive hover:bg-destructive/90"
              >
                Yes, Send to All Users
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
};