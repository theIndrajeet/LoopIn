import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Calendar, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format, isPast, isToday } from "date-fns";

interface TaskCardProps {
  task: {
    id: string;
    title: string;
    description?: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    due_date?: string;
    completed: boolean;
  };
  onComplete: () => void;
  onDelete: () => void;
  onClick: () => void;
}

const priorityConfig = {
  urgent: { label: 'Urgent', color: 'bg-red-500' },
  high: { label: 'High', color: 'bg-orange-500' },
  medium: { label: 'Medium', color: 'bg-yellow-500' },
  low: { label: 'Low', color: 'bg-green-500' },
};

export const TaskCard = ({ task, onComplete, onDelete, onClick }: TaskCardProps) => {
  const getDueDateColor = () => {
    if (!task.due_date) return 'text-muted-foreground';
    const dueDate = new Date(task.due_date);
    if (isPast(dueDate) && !isToday(dueDate)) return 'text-destructive';
    if (isToday(dueDate)) return 'text-yellow-600';
    return 'text-muted-foreground';
  };

  return (
    <Card className="p-4 bg-card/60 backdrop-blur-medium border-border/40 hover:border-primary/40 hover:bg-card/80 hover:shadow-elevated transition-all duration-300 group">
      <div className="flex items-start gap-3">
        <Checkbox
          checked={task.completed}
          onCheckedChange={onComplete}
          className="mt-1"
        />
        
        <div className="flex-1 min-w-0 cursor-pointer" onClick={onClick}>
          <div className="flex items-center gap-2 mb-1">
            <h3 className={`font-medium ${task.completed ? 'line-through text-muted-foreground' : ''}`}>
              {task.title}
            </h3>
            <Badge
              variant="outline"
              className={`${priorityConfig[task.priority].color} text-white border-0`}
            >
              {priorityConfig[task.priority].label}
            </Badge>
          </div>
          
          {task.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
              {task.description}
            </p>
          )}
          
          {task.due_date && (
            <div className={`flex items-center gap-1 text-sm ${getDueDateColor()}`}>
              <Calendar className="w-3 h-3" />
              <span>{format(new Date(task.due_date), 'MMM d, yyyy')}</span>
            </div>
          )}
        </div>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </Card>
  );
};
