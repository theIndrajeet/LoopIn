import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { InlineEditSheet } from "./InlineEditSheet";
import { Badge } from "@/components/ui/badge";

interface QuickPicksSectionProps {
  onHabitCreated: () => void;
}

interface Suggestion {
  title: string;
  difficulty: "easy" | "medium" | "hard";
  emoji: string;
  category?: string;
}

export const QuickPicksSection = ({ onHabitCreated }: QuickPicksSectionProps) => {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSuggestion, setSelectedSuggestion] = useState<Suggestion | null>(null);
  const [editSheetOpen, setEditSheetOpen] = useState(false);

  useEffect(() => {
    fetchSuggestions();
  }, []);

  const fetchSuggestions = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get existing habits to avoid duplicates
      const { data: habits } = await supabase
        .from("habits")
        .select("title")
        .eq("user_id", user.id)
        .eq("active", true);

      const existingTitles = habits?.map(h => h.title) || [];

      const { data, error } = await supabase.functions.invoke('suggest-habits', {
        body: { 
          existingHabits: existingTitles,
          userPrompt: "",
          usePreferences: true
        }
      });

      if (error) throw error;

      if (data?.suggestions) {
        setSuggestions(data.suggestions.slice(0, 5));
      }
    } catch (error: any) {
      console.error("Error fetching suggestions:", error);
      toast({
        title: "Error",
        description: "Failed to load suggestions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAdd = async (suggestion: Suggestion) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Track click
    await supabase.from("suggestion_events").insert({
      user_id: user.id,
      suggestion_type: "quick_pick",
      action: "suggest_click",
      suggestion_id: suggestion.title,
      metadata: { category: suggestion.category, placement: "fab" }
    });

    // Open edit sheet
    setSelectedSuggestion(suggestion);
    setEditSheetOpen(true);
  };

  const handleDismiss = async (suggestion: Suggestion) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Track dismiss
    await supabase.from("suggestion_events").insert({
      user_id: user.id,
      suggestion_type: "quick_pick",
      action: "suggest_dismiss",
      suggestion_id: suggestion.title,
    });

    // Remove from list
    setSuggestions(prev => prev.filter(s => s.title !== suggestion.title));
    
    toast({
      title: "Dismissed",
      description: "We'll show you different suggestions",
    });
  };

  const difficultyColors = {
    easy: "border-success text-success",
    medium: "border-gold text-gold",
    hard: "border-primary text-primary",
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {suggestions.map((suggestion, idx) => (
          <div
            key={idx}
            className="bg-card border border-border rounded-lg p-4 hover:border-primary transition-all"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-2xl">{suggestion.emoji}</span>
                  <h4 className="font-semibold text-base">{suggestion.title}</h4>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={`text-xs ${difficultyColors[suggestion.difficulty]}`}>
                    {suggestion.difficulty}
                  </Badge>
                  {suggestion.category && (
                    <span className="text-xs text-muted-foreground">{suggestion.category}</span>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => handleDismiss(suggestion)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <Button
              onClick={() => handleQuickAdd(suggestion)}
              className="w-full mt-2"
              size="sm"
            >
              Add Habit
            </Button>
          </div>
        ))}

        {suggestions.length === 0 && (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">All suggestions dismissed</p>
            <Button onClick={fetchSuggestions} variant="outline">
              <Sparkles className="w-4 h-4 mr-2" />
              Get New Ideas
            </Button>
          </div>
        )}
      </div>

      {selectedSuggestion && (
        <InlineEditSheet
          open={editSheetOpen}
          onOpenChange={setEditSheetOpen}
          suggestion={selectedSuggestion}
          onSave={onHabitCreated}
        />
      )}
    </>
  );
};