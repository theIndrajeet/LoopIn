import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const ActivityItemSkeleton = () => {
  return (
    <Card className="p-3">
      <div className="flex items-start gap-3">
        <Skeleton className="w-10 h-10 rounded-full shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
    </Card>
  );
};
