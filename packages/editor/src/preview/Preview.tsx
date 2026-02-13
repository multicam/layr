import { useRef, useEffect } from 'react';
import { useProjectStore, useUIStore, useSelectionStore } from '../stores';

export function Preview() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const project = useProjectStore(s => s.project);
  const activeComponent = useProjectStore(s => s.activeComponent);
  const device = useUIStore(s => s.previewDevice);
  const scale = useUIStore(s => s.previewScale);
  
  // Send project to preview
  useEffect(() => {
    if (!iframeRef.current?.contentWindow) return;
    
    const component = activeComponent && project?.files?.components?.[activeComponent];
    if (!component) return;
    
    iframeRef.current.contentWindow.postMessage({
      type: 'component',
      payload: component,
    }, '*');
  }, [project, activeComponent]);
  
  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Toolbar */}
      <div className="h-10 bg-white border-b border-gray-200 flex items-center px-4 gap-4">
        <span className="text-sm text-gray-600">
          Preview: {device.name}
        </span>
        <span className="text-sm text-gray-600">
          {device.width}×{device.height}
        </span>
      </div>
      
      {/* Preview iframe */}
      <div className="flex-1 flex items-center justify-center p-4 overflow-auto">
        <div
          className="bg-white shadow-lg"
          style={{
            width: device.width,
            height: device.height,
            transform: `scale(${scale})`,
            transformOrigin: 'center center',
          }}
        >
          <iframe
            ref={iframeRef}
            src="/preview.html"
            className="w-full h-full border-0"
            title="Preview"
          />
        </div>
      </div>
    </div>
  );
}
