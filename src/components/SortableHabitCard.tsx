import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { HabitCard } from './HabitCard';

interface SortableHabitCardProps {
  id: string;
  habit: any;
  isCompletedToday: boolean;
  onComplete: () => void;
  onArchive: (habitId: string) => void;
  style?: React.CSSProperties;
}

export const SortableHabitCard = ({ id, habit, isCompletedToday, onComplete, onArchive, style }: SortableHabitCardProps) => {
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

  return (
    <div ref={setNodeRef} style={dragStyle} {...attributes} {...listeners}>
      <HabitCard
        habit={habit}
        isCompletedToday={isCompletedToday}
        onComplete={onComplete}
        onArchive={onArchive}
      />
    </div>
  );
};