import { useRef, useEffect, useState, useCallback } from 'react';
import { useProjectStore, useUIStore, useSelectionStore } from '../stores';
import { PreviewBridge, createPreviewListener } from './PreviewMessage';
import { clsx } from 'clsx';

export function Preview() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const bridgeRef = useRef<PreviewBridge | null>(null);
  
  const project = useProjectStore(s => s.project);
  const activeComponent = useProjectStore(s => s.activeComponent);
  const device = useUIStore(s => s.previewDevice);
  const scale = useUIStore(s => s.previewScale);
  const setPreviewScale = useUIStore(s => s.setPreviewScale);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'design' | 'test'>('design');
  
  const selectedIds = useSelectionStore(s => s.selectedIds);
  
  // Initialize bridge
  useEffect(() => {
    if (!iframeRef.current) return;
    
    const bridge = new PreviewBridge({
      // Selection from preview
      selection: (payload) => {
        if (payload.nodeId) {
          useSelectionStore.getState().select(payload.nodeId);
        }
      },
      
      // Selection rect updates
      selectionRect: (payload) => {
        // Could update overlay position here
      },
      
      // Node moved from drag
      nodeMoved: (payload) => {
        const { copy, parent, index } = payload;
        // Update project store
        if (activeComponent) {
          // Would call moveNode here
        }
      },
      
      // Navigation request
      navigate: (payload) => {
        if (payload.component) {
          useProjectStore.getState().setActiveComponent(payload.component);
        }
      },
      
      // Errors
      error: (payload) => {
        setError(payload.message);
      },
    });
    
    bridge.attach(iframeRef.current);
    bridgeRef.current = bridge;
    
    return () => bridge.detach();
  }, [activeComponent]);
  
  // Send component updates
  useEffect(() => {
    if (!bridgeRef.current || !project || !activeComponent) return;
    
    const component = project.files?.components?.[activeComponent];
    if (component) {
      bridgeRef.current.sendComponent(component);
    }
  }, [project, activeComponent]);
  
  // Send selection updates
  useEffect(() => {
    if (!bridgeRef.current) return;
    bridgeRef.current.sendSelection(selectedIds[0] || null);
  }, [selectedIds]);
  
  // Handle iframe load
  const handleLoad = useCallback(() => {
    setIsLoading(false);
    setError(null);
  }, []);
  
  // Handle iframe error
  const handleError = useCallback(() => {
    setError('Failed to load preview');
    setIsLoading(false);
  }, []);
  
  // Toggle design/test mode
  const toggleMode = useCallback(() => {
    const newMode = mode === 'design' ? 'test' : 'design';
    setMode(newMode);
    bridgeRef.current?.sendMode(newMode);
  }, [mode]);
  
  // Refresh preview
  const refresh = useCallback(() => {
    bridgeRef.current?.sendReload();
  }, []);
  
  // Zoom controls
  const zoomIn = () => setPreviewScale(scale + 0.1);
  const zoomOut = () => setPreviewScale(scale - 0.1);
  
  return (
    <div className="h-full flex flex-col bg-gray-100">
      {/* Toolbar */}
      <div className="h-10 bg-white border-b border-gray-200 flex items-center px-4 gap-4">
        {/* Device info */}
        <span className="text-sm text-gray-600">
          {device.name} ({device.width}×{device.height})
        </span>
        
        <div className="flex-1" />
        
        {/* Mode toggle */}
        <button
          onClick={toggleMode}
          className={clsx(
            'px-2 py-1 text-xs rounded',
            mode === 'design' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
          )}
        >
          {mode === 'design' ? 'Design' : 'Test'}
        </button>
        
        {/* Zoom */}
        <div className="flex items-center gap-1">
          <button onClick={zoomOut} className="p-1 hover:bg-gray-100 rounded">−</button>
          <span className="text-xs w-10 text-center">{Math.round(scale * 100)}%</span>
          <button onClick={zoomIn} className="p-1 hover:bg-gray-100 rounded">+</button>
        </div>
        
        {/* Refresh */}
        <button onClick={refresh} className="p-1 hover:bg-gray-100 rounded">
          🔄
        </button>
      </div>
      
      {/* Preview area */}
      <div className="flex-1 flex items-center justify-center p-4 overflow-auto">
        <div
          className="bg-white shadow-lg relative"
          style={{
            width: device.width,
            height: device.height,
            transform: `scale(${scale})`,
            transformOrigin: 'center center',
          }}
        >
          {/* Loading state */}
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
              <div className="text-gray-400">Loading preview...</div>
            </div>
          )}
          
          {/* Error state */}
          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-red-50 z-10">
              <div className="text-red-500">{error}</div>
            </div>
          )}
          
          {/* iframe */}
          <iframe
            ref={iframeRef}
            src="/preview.html"
            className="w-full h-full border-0"
            title="Preview"
            onLoad={handleLoad}
            onError={handleError}
          />
        </div>
      </div>
    </div>
  );
}
