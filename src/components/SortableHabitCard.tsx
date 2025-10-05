import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { HabitCard } from './HabitCard';
import { useIsMobile } from '@/hooks/use-mobile';

interface SortableHabitCardProps {
  id: string;
  habit: any;
  isCompletedToday: boolean;
  onComplete: () => void;
  style?: React.CSSProperties;
}

export const SortableHabitCard = ({ id, habit, isCompletedToday, onComplete, style }: SortableHabitCardProps) => {
  const isMobile = useIsMobile();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id });

  const dragStyle = {
    transform: CSS.Transform.toString(transform),
    transition,
    ...style,
  };

  // On mobile, disable dnd-kit sorting to prevent gesture conflicts
  // Let HabitCard handle swipe gestures directly
  if (isMobile) {
    return (
      <div ref={setNodeRef} style={style}>
        <HabitCard
          habit={habit}
          isCompletedToday={isCompletedToday}
          onComplete={onComplete}
        />
      </div>
    );
  }

  return (
    <div ref={setNodeRef} style={dragStyle} {...attributes} {...listeners}>
      <HabitCard
        habit={habit}
        isCompletedToday={isCompletedToday}
        onComplete={onComplete}
      />
    </div>
  );
};