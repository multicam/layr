import { ReactNode } from 'react';
import { clsx } from 'clsx';
import { useUIStore } from '../stores';

interface LayoutProps {
  left: ReactNode;
  center: ReactNode;
  right: ReactNode;
  preview: ReactNode;
}

export function Layout({ left, center, right, preview }: LayoutProps) {
  const leftOpen = useUIStore(s => s.leftPanelOpen);
  const rightOpen = useUIStore(s => s.rightPanelOpen);
  const previewOpen = useUIStore(s => s.previewOpen);
  
  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left panel - Component tree */}
        <aside
          className={clsx(
            'bg-white border-r border-gray-200 transition-all duration-200 overflow-hidden',
            leftOpen ? 'w-64' : 'w-0'
          )}
        >
          {leftOpen && left}
        </aside>
        
        {/* Center - Canvas */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {center}
        </main>
        
        {/* Right panel - Inspector */}
        <aside
          className={clsx(
            'bg-white border-l border-gray-200 transition-all duration-200 overflow-hidden',
            rightOpen ? 'w-80' : 'w-0'
          )}
        >
          {rightOpen && right}
        </aside>
      </div>
      
      {/* Preview panel */}
      {previewOpen && (
        <div className="h-64 border-t border-gray-200 bg-white">
          {preview}
        </div>
      )}
    </div>
  );
}
