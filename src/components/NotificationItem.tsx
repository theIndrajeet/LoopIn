import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, UserPlus, Users, Flame, TrendingUp } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface NotificationItemProps {
  notification: {
    id: string;
    type: string;
    title: string;
    message: string;
    read: boolean;
    action_url: string | null;
    metadata: any;
    created_at: string;
  };
  onMarkAsRead: (id: string) => void;
  onDelete: (id: string) => void;
}

export const NotificationItem = ({ notification, onMarkAsRead, onDelete }: NotificationItemProps) => {
  const navigate = useNavigate();

  const getIcon = () => {
    switch (notification.type) {
      case 'friend_request':
        return <UserPlus className="h-5 w-5 text-primary" />;
      case 'friend_accepted':
        return <Users className="h-5 w-5 text-success" />;
      case 'streak_milestone':
        return <Flame className="h-5 w-5 text-warning" />;
      case 'level_up':
        return <TrendingUp className="h-5 w-5 text-accent" />;
      default:
        return <Users className="h-5 w-5" />;
    }
  };

  const handleClick = () => {
    if (!notification.read) {
      onMarkAsRead(notification.id);
    }
    
    if (notification.action_url) {
      navigate(notification.action_url);
    }
  };

  return (
    <Card
      className={cn(
        "p-4 transition-colors cursor-pointer relative group",
        !notification.read && "bg-primary/5 border-primary/20"
      )}
      onClick={handleClick}
    >
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={(e) => {
          e.stopPropagation();
          onDelete(notification.id);
        }}
      >
        <X className="h-4 w-4" />
      </Button>

      <div className="flex gap-3">
        <div className="flex-shrink-0 mt-1">
          {getIcon()}
        </div>
        
        <div className="flex-1 space-y-1">
          <div className="flex items-start justify-between gap-2">
            <h4 className="font-semibold text-sm">{notification.title}</h4>
            {!notification.read && (
              <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-1" />
            )}
          </div>
          
          <p className="text-sm text-muted-foreground">{notification.message}</p>
          
          <p className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
          </p>
        </div>
      </div>
    </Card>
  );
};
