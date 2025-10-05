import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Calendar, Flag, Repeat, Zap } from "lucide-react";
import { format } from "date-fns";

interface PendingItem {
  id: string;
  type: "task" | "habit";
  data: any;
}

interface ItemPreviewCardProps {
  item: PendingItem;
  onAdd: () => void;
  onCancel: () => void;
}

export const ItemPreviewCard = ({ item, onAdd, onCancel }: ItemPreviewCardProps) => {
  const priorityColors = {
    low: "text-muted-foreground",
    medium: "text-gold",
    high: "text-destructive",
  };

  const difficultyColors = {
    easy: "text-success",
    medium: "text-gold",
    hard: "text-primary",
  };

  const getDayNames = (days: number[]) => {
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return days.map(d => dayNames[d]).join(", ");
  };

  return (
    <Card className="border-primary/20 bg-card/50 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            {item.type === "task" ? (
              <CheckCircle2 className="w-5 h-5 text-primary" />
            ) : (
              <Repeat className="w-5 h-5 text-primary" />
            )}
            <CardTitle className="text-base">
              New {item.type === "task" ? "Task" : "Habit"}
            </CardTitle>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3 pb-3">
        <p className="font-medium text-foreground">{item.data.title}</p>
        
        {item.data.description && (
          <p className="text-sm text-muted-foreground">{item.data.description}</p>
        )}

        <div className="flex flex-wrap gap-2">
          {item.type === "task" ? (
            <>
              {item.data.priority && (
                <Badge variant="outline" className={priorityColors[item.data.priority as keyof typeof priorityColors]}>
                  <Flag className="w-3 h-3 mr-1" />
                  {item.data.priority}
                </Badge>
              )}
              {item.data.due_date && (
                <Badge variant="outline">
                  <Calendar className="w-3 h-3 mr-1" />
                  {format(new Date(item.data.due_date), "MMM d, yyyy")}
                </Badge>
              )}
            </>
          ) : (
            <>
              {item.data.difficulty && (
                <Badge variant="outline" className={difficultyColors[item.data.difficulty as keyof typeof difficultyColors]}>
                  <Zap className="w-3 h-3 mr-1" />
                  {item.data.difficulty}
                </Badge>
              )}
              {item.data.schedule_days && (
                <Badge variant="outline">
                  <Repeat className="w-3 h-3 mr-1" />
                  {getDayNames(item.data.schedule_days)}
                </Badge>
              )}
            </>
          )}
        </div>

        {item.data.subtasks && item.data.subtasks.length > 0 && (
          <div className="space-y-1 mt-2">
            <p className="text-xs text-muted-foreground">Subtasks:</p>
            {item.data.subtasks.map((subtask: string, idx: number) => (
              <div key={idx} className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="w-3 h-3 text-muted-foreground" />
                <span>{subtask}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <CardFooter className="flex gap-2 pt-3">
        <Button onClick={onCancel} variant="outline" className="flex-1">
          Cancel
        </Button>
        <Button onClick={onAdd} className="flex-1">
          Add {item.type === "task" ? "Task" : "Habit"}
        </Button>
      </CardFooter>
    </Card>
  );
};
