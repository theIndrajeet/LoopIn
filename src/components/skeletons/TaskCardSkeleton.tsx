import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const TaskCardSkeleton = ({ delay = 0 }: { delay?: number }) => {
  return (
    <Card 
      className="p-4 bg-card/60 backdrop-blur-medium border-border/40 animate-fade-in" 
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start gap-3">
        <Skeleton className="w-5 h-5 rounded-md shrink-0 mt-1" />
        
        <div className="flex-1 min-w-0 space-y-3">
          <div className="flex items-center gap-2">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-5 w-16 rounded-md" />
          </div>
          
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          
          <Skeleton className="h-4 w-32" />
        </div>
        
        <Skeleton className="w-8 h-8 rounded-md shrink-0" />
      </div>
    </Card>
  );
};
