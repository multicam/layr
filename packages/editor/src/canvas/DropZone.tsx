import { clsx } from 'clsx';

interface DropZoneProps {
  visible: boolean;
  position: 'before' | 'after' | 'inside';
  horizontal?: boolean;
}

export function DropZone({ visible, position, horizontal = false }: DropZoneProps) {
  if (!visible) return null;
  
  return (
    <div
      className={clsx(
        'absolute pointer-events-none',
        horizontal 
          ? 'h-1 bg-blue-500 opacity-50' 
          : 'w-1 bg-blue-500 opacity-50'
      )}
      style={{
        [horizontal ? 'top' : 'left']: position === 'before' ? -2 : position === 'after' ? 'auto' : 0,
        [horizontal ? 'bottom' : 'right']: position === 'after' ? -2 : 'auto',
      }}
    />
  );
}
