import { useEffect, useState } from 'react';
import { useSelectionStore } from '../stores';

interface Guide {
  type: 'horizontal' | 'vertical';
  position: number;
  start: number;
  end: number;
}

export function Guides() {
  const hoveredId = useSelectionStore(s => s.hoveredId);
  const [guides, setGuides] = useState<Guide[]>([]);
  
  useEffect(() => {
    if (!hoveredId) {
      setGuides([]);
      return;
    }
    
    const element = document.querySelector(`[data-id="${hoveredId}"]`);
    if (!element) {
      setGuides([]);
      return;
    }
    
    const rect = element.getBoundingClientRect();
    
    setGuides([
      // Top guide
      { type: 'horizontal', position: rect.top, start: 0, end: window.innerWidth },
      // Bottom guide  
      { type: 'horizontal', position: rect.bottom, start: 0, end: window.innerWidth },
      // Left guide
      { type: 'vertical', position: rect.left, start: 0, end: window.innerHeight },
      // Right guide
      { type: 'vertical', position: rect.right, start: 0, end: window.innerHeight },
    ]);
  }, [hoveredId]);
  
  if (guides.length === 0) return null;
  
  return (
    <div className="pointer-events-none fixed inset-0">
      {guides.map((guide, i) => (
        guide.type === 'horizontal' ? (
          <div
            key={i}
            className="absolute bg-purple-500"
            style={{
              left: guide.start,
              top: guide.position,
              width: guide.end - guide.start,
              height: 1,
              opacity: 0.5,
            }}
          />
        ) : (
          <div
            key={i}
            className="absolute bg-purple-500"
            style={{
              left: guide.position,
              top: guide.start,
              width: 1,
              height: guide.end - guide.start,
              opacity: 0.5,
            }}
          />
        )
      ))}
    </div>
  );
}
