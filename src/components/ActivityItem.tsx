import { formatDistanceToNow } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Flame, Zap, CheckCircle2, Trophy } from 'lucide-react';
import { useUserTimezone } from '@/hooks/use-user-timezone';
import { convertToUserTimezone } from '@/lib/timezone-utils';

interface ActivityItemProps {
  event: {
    id: string;
    type: string;
    payload: any;
    created_at: string;
    profiles?: {
      display_name: string;
      avatar_url?: string;
    };
  };
}

const getEventIcon = (type: string) => {
  switch (type) {
    case 'streak_milestone':
      return <Flame className="w-4 h-4 text-gold" />;
    case 'level_up':
      return <Zap className="w-4 h-4 text-primary" />;
    case 'habit_completed':
      return <CheckCircle2 className="w-4 h-4 text-success" />;
    case 'first_completion':
      return <Trophy className="w-4 h-4 text-gold" />;
    default:
      return <CheckCircle2 className="w-4 h-4 text-muted-foreground" />;
  }
};

const getEventMessage = (type: string, payload: any) => {
  switch (type) {
    case 'streak_milestone':
      return `hit a ${payload.streak_count}-day streak on "${payload.habit_title}"`;
    case 'level_up':
      return `reached Level ${payload.level}`;
    case 'habit_completed':
      return `completed "${payload.habit_title}"`;
    case 'first_completion':
      return `completed their first "${payload.habit_title}"`;
    default:
      return 'achieved something great';
  }
};

export const ActivityItem = ({ event }: ActivityItemProps) => {
  const { timezone } = useUserTimezone();
  const displayName = event.profiles?.display_name || 'Someone';
  const avatarUrl = event.profiles?.avatar_url;
  const initials = displayName.slice(0, 2).toUpperCase();
  
  // Convert to user's timezone before calculating distance
  const userDate = convertToUserTimezone(event.created_at, timezone);
  const timeAgo = formatDistanceToNow(userDate, { addSuffix: true });

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-card/50 border border-border/50 hover:border-primary/30 transition-colors">
      <Avatar className="w-10 h-10 border-2 border-border">
        <AvatarImage src={avatarUrl} alt={displayName} />
        <AvatarFallback className="bg-primary/20 text-primary text-sm">
          {initials}
        </AvatarFallback>
      </Avatar>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2">
          <div className="flex-shrink-0 mt-0.5">
            {getEventIcon(event.type)}
          </div>
          <div className="flex-1">
            <p className="text-sm text-foreground leading-relaxed">
              <span className="font-semibold">{displayName}</span>
              {' '}
              {getEventMessage(event.type, event.payload)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">{timeAgo}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
