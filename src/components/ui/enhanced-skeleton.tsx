import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface EnhancedSkeletonProps {
  className?: string;
  variant?: "default" | "card" | "text" | "avatar" | "button";
  lines?: number;
  animate?: boolean;
}

const skeletonVariants = {
  pulse: {
    opacity: [0.4, 0.8, 0.4],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: "easeInOut"
    }
  },
  shimmer: {
    backgroundPosition: ["200% 0", "-200% 0"],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: "linear"
    }
  }
};

export function EnhancedSkeleton({ 
  className, 
  variant = "default", 
  lines = 1, 
  animate = true,
  ...props 
}: EnhancedSkeletonProps) {
  const baseClasses = "bg-gradient-to-r from-muted via-muted/50 to-muted bg-[length:200%_100%] rounded-md";
  
  const variantClasses = {
    default: "h-4 w-full",
    card: "h-32 w-full",
    text: "h-3 w-full",
    avatar: "h-10 w-10 rounded-full",
    button: "h-10 w-24"
  };

  if (variant === "text" && lines > 1) {
    return (
      <div className="space-y-2">
        {Array.from({ length: lines }).map((_, i) => (
          <motion.div
            key={i}
            className={cn(
              baseClasses,
              variantClasses.text,
              i === lines - 1 && "w-3/4", // Last line shorter
              className
            )}
            variants={animate ? skeletonVariants : undefined}
            animate={animate ? "pulse" : undefined}
            style={{
              animationDelay: animate ? `${i * 0.1}s` : undefined
            }}
            {...props}
          />
        ))}
      </div>
    );
  }

  return (
    <motion.div
      className={cn(
        baseClasses,
        variantClasses[variant],
        animate && "animate-shimmer",
        className
      )}
      variants={animate ? skeletonVariants : undefined}
      animate={animate ? "pulse" : undefined}
      {...props}
    />
  );
}

// Specific skeleton components
export function HabitCardSkeleton({ className }: { className?: string }) {
  return (
    <motion.div 
      className={cn("p-4 border rounded-lg space-y-3", className)}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center justify-between">
        <EnhancedSkeleton variant="avatar" />
        <EnhancedSkeleton variant="button" className="h-8 w-16" />
      </div>
      <div className="space-y-2">
        <EnhancedSkeleton className="h-5 w-3/4" />
        <EnhancedSkeleton variant="text" lines={2} />
      </div>
      <div className="flex items-center justify-between">
        <EnhancedSkeleton className="h-4 w-20" />
        <EnhancedSkeleton className="h-4 w-16" />
      </div>
    </motion.div>
  );
}

export function TaskCardSkeleton({ className }: { className?: string }) {
  return (
    <motion.div 
      className={cn("p-4 border rounded-lg space-y-3", className)}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-2 flex-1">
          <EnhancedSkeleton className="h-5 w-2/3" />
          <EnhancedSkeleton variant="text" lines={2} />
        </div>
        <EnhancedSkeleton variant="button" className="h-8 w-20" />
      </div>
      <div className="flex items-center gap-2">
        <EnhancedSkeleton className="h-4 w-4 rounded" />
        <EnhancedSkeleton className="h-4 w-24" />
      </div>
    </motion.div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-background pb-20 md:pb-8">
      <div className="container max-w-6xl mx-auto px-4 py-4 sm:py-8">
        {/* Header Skeleton */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
          <div className="space-y-2">
            <EnhancedSkeleton className="h-8 w-64" />
            <EnhancedSkeleton className="h-4 w-48" />
          </div>
          <div className="flex items-center gap-2">
            <EnhancedSkeleton variant="avatar" />
            <EnhancedSkeleton variant="avatar" />
          </div>
        </div>

        {/* Tabs Skeleton */}
        <div className="mb-6">
          <EnhancedSkeleton className="h-10 w-48" />
        </div>

        {/* Content Grid Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <HabitCardSkeleton key={i} />
          ))}
        </div>

        {/* Stats Cards Skeleton */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <motion.div 
              key={i}
              className="p-6 border rounded-lg space-y-3"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.1 }}
            >
              <EnhancedSkeleton variant="avatar" className="h-8 w-8" />
              <EnhancedSkeleton className="h-8 w-16" />
              <EnhancedSkeleton className="h-4 w-24" />
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
