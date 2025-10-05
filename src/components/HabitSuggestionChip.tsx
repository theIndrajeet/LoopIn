import { Badge } from "@/components/ui/badge";

interface HabitSuggestion {
  title: string;
  emoji: string;
  difficulty: "easy" | "medium" | "hard";
  category?: string;
}

interface HabitSuggestionChipProps {
  suggestion: HabitSuggestion;
  onClick: (suggestion: HabitSuggestion) => void;
}

export const HabitSuggestionChip = ({ suggestion, onClick }: HabitSuggestionChipProps) => {
  const difficultyColors = {
    easy: "text-success",
    medium: "text-gold",
    hard: "text-primary",
  };

  return (
    <button
      onClick={() => onClick(suggestion)}
      className="group relative flex items-center gap-3 p-3 rounded-xl bg-card border border-border hover:border-primary transition-all duration-200 hover:scale-105 hover:shadow-glow-primary text-left w-full"
    >
      <span className="text-2xl flex-shrink-0">{suggestion.emoji}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{suggestion.title}</p>
      </div>
      <Badge variant="outline" className={`text-xs ${difficultyColors[suggestion.difficulty]} flex-shrink-0`}>
        {suggestion.difficulty}
      </Badge>
    </button>
  );
};
