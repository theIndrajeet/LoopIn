import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const HabitCardSkeleton = ({ delay = 0 }: { delay?: number }) => {
  return (
    <Card 
      className="p-4 bg-card/60 backdrop-blur-medium border-border/40 animate-fade-in" 
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start gap-3">
        <Skeleton className="w-5 h-5 rounded-md shrink-0 mt-1" />
        
        <div className="flex-1 min-w-0 space-y-3">
          <div className="flex items-center gap-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-5 w-12 rounded-full" />
          </div>
          
          <Skeleton className="h-4 w-full" />
          
          <div className="flex items-center gap-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-20" />
          </div>
        </div>
        
        <Skeleton className="w-8 h-8 rounded-md shrink-0" />
      </div>
    </Card>
  );
};
