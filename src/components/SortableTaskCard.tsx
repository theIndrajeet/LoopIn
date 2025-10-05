import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { TaskCard } from './TaskCard';

interface SortableTaskCardProps {
  id: string;
  task: any;
  onComplete: () => void;
  onDelete: () => void;
  onClick: () => void;
  style?: React.CSSProperties;
}

export const SortableTaskCard = ({ id, task, onComplete, onDelete, onClick, style }: SortableTaskCardProps) => {
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
      <TaskCard
        task={task}
        onComplete={onComplete}
        onDelete={onDelete}
        onClick={onClick}
      />
    </div>
  );
};
