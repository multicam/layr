import { useEffect, useRef, useState } from 'react';
import { useSelectionStore } from '../stores';

export function SelectionBox() {
  const selectedIds = useSelectionStore(s => s.selectedIds);
  const [rects, setRects] = useState<Map<string, DOMRect>>(new Map());
  const rafRef = useRef<number>();
  
  useEffect(() => {
    // Only run rAF loop when there are selections
    if (selectedIds.length === 0) {
      setRects(new Map());
      return;
    }

    const updateRects = () => {
      const newRects = new Map<string, DOMRect>();

      for (const id of selectedIds) {
        const element = document.querySelector(`[data-id="${id}"]`);
        if (element) {
          newRects.set(id, element.getBoundingClientRect());
        }
      }

      setRects(prev => {
        // Check if changed
        if (prev.size !== newRects.size) return newRects;
        for (const [id, rect] of newRects) {
          const prevRect = prev.get(id);
          if (!prevRect ||
              prevRect.left !== rect.left ||
              prevRect.top !== rect.top ||
              prevRect.width !== rect.width ||
              prevRect.height !== rect.height) {
            return newRects;
          }
        }
        return prev;
      });

      rafRef.current = requestAnimationFrame(updateRects);
    };

    rafRef.current = requestAnimationFrame(updateRects);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [selectedIds]);
  
  return (
    <div className="pointer-events-none fixed inset-0">
      {Array.from(rects.entries()).map(([id, rect]) => (
        <div
          key={id}
          className="absolute border-2 border-blue-500 pointer-events-none"
          style={{
            left: rect.left - 2,
            top: rect.top - 2,
            width: rect.width + 4,
            height: rect.height + 4,
          }}
        >
          {/* Resize handles */}
          <ResizeHandle position="nw" />
          <ResizeHandle position="ne" />
          <ResizeHandle position="sw" />
          <ResizeHandle position="se" />
        </div>
      ))}
    </div>
  );
}

function ResizeHandle({ position }: { position: 'nw' | 'ne' | 'sw' | 'se' }) {
  const positions = {
    nw: { top: -4, left: -4, cursor: 'nw-resize' },
    ne: { top: -4, right: -4, cursor: 'ne-resize' },
    sw: { bottom: -4, left: -4, cursor: 'sw-resize' },
    se: { bottom: -4, right: -4, cursor: 'se-resize' },
  };
  
  const pos = positions[position];
  
  return (
    <div
      className="absolute w-2 h-2 bg-white border border-blue-500 rounded-sm"
      style={{
        top: pos.top,
        bottom: 'bottom' in pos ? pos.bottom : undefined,
        left: pos.left,
        right: 'right' in pos ? pos.right : undefined,
        cursor: pos.cursor,
      }}
    />
  );
}
