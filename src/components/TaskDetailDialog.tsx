import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Check, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface TaskDetailDialogProps {
  task: {
    id: string;
    title: string;
    description?: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    due_date?: string;
    completed: boolean;
    completed_at?: string;
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTaskUpdated: () => void;
}

const priorityConfig = {
  urgent: { label: 'Urgent', color: 'bg-red-500' },
  high: { label: 'High', color: 'bg-orange-500' },
  medium: { label: 'Medium', color: 'bg-yellow-500' },
  low: { label: 'Low', color: 'bg-green-500' },
};

export const TaskDetailDialog = ({ task, open, onOpenChange, onTaskUpdated }: TaskDetailDialogProps) => {
  const [isUpdating, setIsUpdating] = useState(false);

  if (!task) return null;

  const handleToggleComplete = async () => {
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from("tasks")
        .update({
          completed: !task.completed,
          completed_at: !task.completed ? new Date().toISOString() : null,
        })
        .eq("id", task.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: task.completed ? "Task marked as incomplete" : "Task completed!",
      });

      onTaskUpdated();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from("tasks")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", task.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Task moved to trash",
      });

      onOpenChange(false);
      onTaskUpdated();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {task.title}
            <Badge
              variant="outline"
              className={`${priorityConfig[task.priority].color} text-white border-0`}
            >
              {priorityConfig[task.priority].label}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          {task.description && (
            <div>
              <h4 className="text-sm font-medium mb-2">Description</h4>
              <p className="text-sm text-muted-foreground">{task.description}</p>
            </div>
          )}

          {task.due_date && (
            <div>
              <h4 className="text-sm font-medium mb-2">Due Date</h4>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span>{format(new Date(task.due_date), 'MMMM d, yyyy')}</span>
              </div>
            </div>
          )}

          <div>
            <h4 className="text-sm font-medium mb-2">Status</h4>
            <Badge variant={task.completed ? "default" : "secondary"}>
              {task.completed ? "Completed" : "Active"}
            </Badge>
          </div>

          {task.completed && task.completed_at && (
            <div>
              <h4 className="text-sm font-medium mb-2">Completed At</h4>
              <p className="text-sm text-muted-foreground">
                {format(new Date(task.completed_at), 'MMMM d, yyyy h:mm a')}
              </p>
            </div>
          )}

          <div className="flex gap-2 pt-4">
            <Button
              onClick={handleToggleComplete}
              disabled={isUpdating}
              variant={task.completed ? "outline" : "default"}
              className="flex-1"
            >
              <Check className="w-4 h-4 mr-2" />
              {task.completed ? "Mark Incomplete" : "Mark Complete"}
            </Button>
            <Button
              onClick={handleDelete}
              disabled={isUpdating}
              variant="destructive"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
