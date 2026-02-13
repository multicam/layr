import { useRef, useEffect, useCallback, useState } from 'react';
import { useUIStore, useSelectionStore, useProjectStore } from '../stores';
import { NodeRenderer } from './NodeRenderer';
import { SelectionBox } from './SelectionBox';
import { clsx } from 'clsx';

export function Canvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  
  const zoom = useUIStore(s => s.zoom);
  const panX = useUIStore(s => s.panX);
  const panY = useUIStore(s => s.panY);
  const setPan = useUIStore(s => s.setPan);
  const setZoom = useUIStore(s => s.setZoom);
  
  const project = useProjectStore(s => s.project);
  const activeComponent = useProjectStore(s => s.activeComponent);
  const clearSelection = useSelectionStore(s => s.clearSelection);
  
  // Mouse wheel zoom
  const handleWheel = useCallback((e: WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setZoom(zoom + delta);
    }
  }, [zoom, setZoom]);
  
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);
  
  // Pan handling
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - panX, y: e.clientY - panY });
      e.preventDefault();
    } else if (e.button === 0) {
      // Clear selection on canvas click
      clearSelection();
    }
  }, [panX, panY, clearSelection]);
  
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning) {
      setPan(e.clientX - panStart.x, e.clientY - panStart.y);
    }
  }, [isPanning, panStart, setPan]);
  
  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);
  
  // Get component to render
  const component = activeComponent && project?.files?.components?.[activeComponent];
  
  return (
    <div
      ref={containerRef}
      className={clsx(
        'flex-1 overflow-hidden bg-gray-200',
        isPanning ? 'cursor-grabbing' : 'cursor-default'
      )}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Canvas content */}
      <div
        className="origin-top-left"
        style={{
          transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
        }}
      >
        {component && (
          <NodeRenderer 
            component={component} 
          />
        )}
      </div>
      
      {/* Selection overlay */}
      <SelectionBox />
    </div>
  );
}
