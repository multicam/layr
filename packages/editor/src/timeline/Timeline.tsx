import { useState, useRef, useEffect } from 'react';
import { clsx } from 'clsx';

interface Keyframe {
  time: number;
  label?: string;
}

interface TimelineProps {
  duration: number;
  keyframes: Keyframe[];
  currentTime: number;
  onTimeChange: (time: number) => void;
  onPlay: () => void;
  onPause: () => void;
  isPlaying: boolean;
}

export function Timeline({
  duration,
  keyframes,
  currentTime,
  onTimeChange,
  onPlay,
  onPause,
  isPlaying,
}: TimelineProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  const normalizedTime = duration > 0 ? currentTime / duration : 0;
  
  const handleClick = (e: React.MouseEvent) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percent = Math.max(0, Math.min(1, x / rect.width));
    onTimeChange(percent * duration);
  };
  
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    handleClick(e);
  };
  
  useEffect(() => {
    if (!isDragging) return;
    
    const handleMouseMove = (e: MouseEvent) => {
      if (!trackRef.current) return;
      const rect = trackRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percent = Math.max(0, Math.min(1, x / rect.width));
      onTimeChange(percent * duration);
    };
    
    const handleMouseUp = () => setIsDragging(false);
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, duration, onTimeChange]);
  
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };
  
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3">
      <div className="flex items-center gap-3 mb-3">
        <button
          onClick={isPlaying ? onPause : onPlay}
          className="w-8 h-8 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded"
        >
          {isPlaying ? '⏸' : '▶'}
        </button>
        <div className="text-sm font-mono">
          {formatTime(currentTime)} / {formatTime(duration)}
        </div>
      </div>
      
      <div
        ref={trackRef}
        className="relative h-8 bg-gray-100 rounded cursor-pointer"
        onMouseDown={handleMouseDown}
      >
        {keyframes.map((kf, i) => (
          <div
            key={i}
            className="absolute top-1/2 -translate-y-1/2 w-2 h-2 bg-blue-500 rounded-full"
            style={{ left: `${kf.time * 100}%` }}
            title={kf.label || `Keyframe ${i + 1}`}
          />
        ))}
        
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-red-500"
          style={{ left: `${normalizedTime * 100}%` }}
        >
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-red-500 rounded-full" />
        </div>
      </div>
    </div>
  );
}
