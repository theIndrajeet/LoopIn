import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface InlineEditSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  suggestion: {
    title: string;
    difficulty: "easy" | "medium" | "hard";
    emoji: string;
  };
  onSave: () => void;
}

export const InlineEditSheet = ({ open, onOpenChange, suggestion, onSave }: InlineEditSheetProps) => {
  const [title, setTitle] = useState("");
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [loading, setLoading] = useState(false);
  const [edited, setEdited] = useState(false);

  useEffect(() => {
    if (open && suggestion) {
      setTitle(`${suggestion.emoji} ${suggestion.title}`);
      setDifficulty(suggestion.difficulty);
      setEdited(false);
    }
  }, [open, suggestion]);

  const handleSave = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("habits")
        .insert({
          user_id: user.id,
          title,
          difficulty,
          added_from_suggestion: true,
          suggestion_source: "fab_quick_pick"
        });

      if (error) throw error;

      // Track habit added from suggestion
      await supabase.from("suggestion_events").insert({
        user_id: user.id,
        suggestion_type: "quick_pick",
        action: "habit_added_from_suggest",
        suggestion_id: suggestion.title,
        metadata: { edited_before_save: edited }
      });

      toast({
        title: "Habit created! 🎯",
        description: "Time to start building that streak!",
      });

      onOpenChange(false);
      onSave();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Customize your habit</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="edit-title">Habit name</Label>
            <Input
              id="edit-title"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value.slice(0, 50));
                setEdited(true);
              }}
              maxLength={50}
              className="bg-input border-border"
            />
            <p className="text-xs text-muted-foreground">{title.length}/50</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-difficulty">Difficulty</Label>
            <Select 
              value={difficulty} 
              onValueChange={(v: any) => {
                setDifficulty(v);
                setEdited(true);
              }}
            >
              <SelectTrigger id="edit-difficulty" className="bg-input border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border">
                <SelectItem value="easy">Easy (10 XP)</SelectItem>
                <SelectItem value="medium">Medium (15 XP)</SelectItem>
                <SelectItem value="hard">Hard (20 XP)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2 pt-2">
            <Button
              onClick={() => onOpenChange(false)}
              variant="outline"
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={loading || !title.trim()}
              className="flex-1"
            >
              {loading ? "Creating..." : "Create Habit"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};