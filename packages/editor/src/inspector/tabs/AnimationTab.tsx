import { useState } from 'react';
import { Timeline } from '../../timeline';
import type { NodeModel } from '@layr/types';

interface AnimationTabProps {
  node: NodeModel;
}

export function AnimationTab({ node }: AnimationTabProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(1);
  
  const keyframes = [
    { time: 0, label: 'Start' },
    { time: 0.5, label: 'Middle' },
    { time: 1, label: 'End' },
  ];
  
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-gray-700">Animation</h3>
      
      {/* Animation properties */}
      <div className="space-y-2">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Duration</label>
          <input
            type="number"
            value={duration}
            onChange={(e) => setDuration(parseFloat(e.target.value) || 1)}
            min={0.1}
            step={0.1}
            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded"
          />
        </div>
        
        <div>
          <label className="block text-xs text-gray-500 mb-1">Timing Function</label>
          <select className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded">
            <option value="ease">ease</option>
            <option value="linear">linear</option>
            <option value="ease-in">ease-in</option>
            <option value="ease-out">ease-out</option>
            <option value="ease-in-out">ease-in-out</option>
          </select>
        </div>
        
        <div>
          <label className="block text-xs text-gray-500 mb-1">Fill Mode</label>
          <select className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded">
            <option value="none">none</option>
            <option value="forwards">forwards</option>
            <option value="backwards">backwards</option>
            <option value="both">both</option>
          </select>
        </div>
      </div>
      
      {/* Timeline */}
      <Timeline
        duration={duration}
        keyframes={keyframes}
        currentTime={currentTime}
        onTimeChange={setCurrentTime}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        isPlaying={isPlaying}
      />
      
      {/* Keyframe list */}
      <div>
        <h4 className="text-xs text-gray-500 mb-2">Keyframes</h4>
        <div className="space-y-1">
          {keyframes.map((kf, i) => (
            <div
              key={i}
              className="flex items-center gap-2 p-2 bg-gray-50 rounded text-sm"
            >
              <span className="w-8 text-gray-400">{Math.round(kf.time * 100)}%</span>
              <span>{kf.label || `Keyframe ${i + 1}`}</span>
            </div>
          ))}
        </div>
        
        <button className="w-full mt-2 py-1.5 text-sm text-blue-600 border border-blue-600 rounded hover:bg-blue-50">
          + Add Keyframe
        </button>
      </div>
    </div>
  );
}
