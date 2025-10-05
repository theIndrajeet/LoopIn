import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Sparkles, Lightbulb } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { HabitSuggestionChip } from "./HabitSuggestionChip";
import { Skeleton } from "@/components/ui/skeleton";

interface CreateHabitDialogProps {
  onHabitCreated: () => void;
}

const PREMADE_SUGGESTIONS = [
  { title: "Wash face", emoji: "🧼", difficulty: "easy" as const },
  { title: "Make bed", emoji: "🛏️", difficulty: "easy" as const },
  { title: "Drink water", emoji: "💧", difficulty: "easy" as const },
  { title: "Walk 10 min", emoji: "🚶", difficulty: "medium" as const },
  { title: "Read 15 min", emoji: "📖", difficulty: "medium" as const },
  { title: "Meditate 5 min", emoji: "🧘", difficulty: "easy" as const },
  { title: "Workout 30 min", emoji: "💪", difficulty: "hard" as const },
  { title: "Journal", emoji: "📝", difficulty: "easy" as const },
];

export const CreateHabitDialog = ({ onHabitCreated }: CreateHabitDialogProps) => {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loadingAI, setLoadingAI] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
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
        });

      if (error) throw error;

      toast({
        title: "Habit created! 🎯",
        description: "Time to start building that streak!",
      });

      setTitle("");
      setDifficulty("medium");
      setOpen(false);
      onHabitCreated();
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

  const showQuickPicks = () => {
    setSuggestions(PREMADE_SUGGESTIONS.sort(() => Math.random() - 0.5).slice(0, 8));
    setShowSuggestions(true);
  };

  const getAISuggestions = async () => {
    setLoadingAI(true);
    try {
      const { data, error } = await supabase.functions.invoke('suggest-habits', {
        body: { existingHabits: [], userPrompt: "" }
      });

      if (error) throw error;
      if (data?.suggestions) {
        setSuggestions(data.suggestions);
        setShowSuggestions(true);
      }
    } catch (error: any) {
      toast({
        title: "AI unavailable",
        description: "Showing quick picks instead",
      });
      showQuickPicks();
    } finally {
      setLoadingAI(false);
    }
  };

  const selectSuggestion = (suggestion: any) => {
    setTitle(suggestion.title);
    setDifficulty(suggestion.difficulty);
    setShowSuggestions(false);
  };

  const formContent = (
    <>
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <Button variant="secondary" onClick={showQuickPicks} disabled={loadingAI} className="flex-1">
          <Lightbulb className="w-4 h-4 mr-2" />
          Quick Picks
        </Button>
        <Button onClick={getAISuggestions} disabled={loadingAI} className="flex-1">
          {loadingAI ? (
            <>Loading...</>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Ask AI
            </>
          )}
        </Button>
      </div>

      {showSuggestions && (
        <div className="mb-4 max-h-60 overflow-y-auto">
          <div className="grid grid-cols-2 gap-2">
            {loadingAI ? (
              Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-16 bg-card/50" />
              ))
            ) : (
              suggestions.map((suggestion, idx) => (
                <HabitSuggestionChip
                  key={idx}
                  suggestion={suggestion}
                  onClick={selectSuggestion}
                />
              ))
            )}
          </div>
        </div>
      )}

      <form onSubmit={handleCreate} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="title">Habit name</Label>
          <Input
            id="title"
            placeholder="📖 Read for 15 minutes"
            value={title}
            onChange={(e) => setTitle(e.target.value.slice(0, 50))}
            required
            maxLength={50}
            className="bg-input border-border text-foreground"
          />
          <p className="text-xs text-muted-foreground">Emoji supported! {title.length}/50</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="difficulty">Difficulty</Label>
          <Select value={difficulty} onValueChange={(v: any) => setDifficulty(v)}>
            <SelectTrigger id="difficulty" className="bg-input border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border">
              <SelectItem value="easy">Easy (10 XP)</SelectItem>
              <SelectItem value="medium">Medium (15 XP)</SelectItem>
              <SelectItem value="hard">Hard (20 XP)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Creating..." : "Create Habit"}
        </Button>
      </form>
    </>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger asChild>
          <Button size="lg" className="gap-2">
            <Plus className="w-5 h-5" />
            New Habit
          </Button>
        </DrawerTrigger>
        <DrawerContent className="bg-popover border-border">
          <DrawerHeader>
            <DrawerTitle className="text-xl sm:text-2xl">Create a new habit</DrawerTitle>
            <DrawerDescription className="text-sm sm:text-base">
              Choose something you want to do daily to build a strong streak.
            </DrawerDescription>
          </DrawerHeader>
          <div className="px-4 pb-6 max-h-[70vh] overflow-y-auto">
            {formContent}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg" className="gap-2">
          <Plus className="w-5 h-5" />
          New Habit
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto bg-popover border-border">
        <DialogHeader>
          <DialogTitle className="text-xl sm:text-2xl">Create a new habit</DialogTitle>
          <DialogDescription className="text-sm sm:text-base">
            Choose something you want to do daily to build a strong streak.
          </DialogDescription>
        </DialogHeader>
        {formContent}
      </DialogContent>
    </Dialog>
  );
};
