import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NotificationsList } from "./NotificationsList";
import { NotificationSettings } from "./NotificationSettings";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";

export const NotificationBell = () => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetchUnreadCount();

    // Subscribe to realtime notifications
    const channel = supabase
      .channel('notifications-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications'
        },
        () => {
          fetchUnreadCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchUnreadCount = async () => {
    const { data: session } = await supabase.auth.getSession();
    if (!session.session) return;

    const { count } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', session.session.user.id)
      .eq('read', false);

    setUnreadCount(count || 0);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Alerts</SheetTitle>
        </SheetHeader>
        <Tabs defaultValue="notifications" className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="notifications" className="relative">
              Notifications
              {unreadCount > 0 && (
                <Badge 
                  variant="destructive" 
                  className="ml-2 h-5 w-5 flex items-center justify-center p-0 text-xs"
                >
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>
          <TabsContent value="notifications" className="mt-4">
            <NotificationsList onNotificationRead={fetchUnreadCount} />
          </TabsContent>
          <TabsContent value="settings" className="mt-4">
            <NotificationSettings />
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
};
