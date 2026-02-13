import { clsx } from 'clsx';
import { useUIStore, DEVICE_PRESETS } from '../stores';
import { useHistoryStore } from '../stores';

export function Header() {
  const zoom = useUIStore(s => s.zoom);
  const setZoom = useUIStore(s => s.setZoom);
  const resetView = useUIStore(s => s.resetView);
  
  const leftOpen = useUIStore(s => s.leftPanelOpen);
  const rightOpen = useUIStore(s => s.rightPanelOpen);
  const previewOpen = useUIStore(s => s.previewOpen);
  const toggleLeftPanel = useUIStore(s => s.toggleLeftPanel);
  const toggleRightPanel = useUIStore(s => s.toggleRightPanel);
  const togglePreview = useUIStore(s => s.togglePreview);
  
  const previewDevice = useUIStore(s => s.previewDevice);
  const setPreviewDevice = useUIStore(s => s.setPreviewDevice);
  
  const canUndo = useHistoryStore(s => s.past.length > 0);
  const canRedo = useHistoryStore(s => s.future.length > 0);
  const undo = useHistoryStore(s => s.undo);
  const redo = useHistoryStore(s => s.redo);
  
  return (
    <header className="h-12 bg-white border-b border-gray-200 flex items-center px-4 gap-4">
      {/* Logo */}
      <div className="font-bold text-lg text-gray-900">Layr</div>
      
      {/* Undo/Redo */}
      <div className="flex items-center gap-1">
        <button
          onClick={undo}
          disabled={!canUndo}
          className={clsx(
            'p-2 rounded hover:bg-gray-100',
            !canUndo && 'opacity-50 cursor-not-allowed'
          )}
          title="Undo (Ctrl+Z)"
        >
          <UndoIcon />
        </button>
        <button
          onClick={redo}
          disabled={!canRedo}
          className={clsx(
            'p-2 rounded hover:bg-gray-100',
            !canRedo && 'opacity-50 cursor-not-allowed'
          )}
          title="Redo (Ctrl+Shift+Z)"
        >
          <RedoIcon />
        </button>
      </div>
      
      {/* Zoom controls */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setZoom(zoom - 0.1)}
          className="p-2 rounded hover:bg-gray-100"
          title="Zoom out"
        >
          −
        </button>
        <span className="text-sm w-12 text-center">{Math.round(zoom * 100)}%</span>
        <button
          onClick={() => setZoom(zoom + 0.1)}
          className="p-2 rounded hover:bg-gray-100"
          title="Zoom in"
        >
          +
        </button>
        <button
          onClick={resetView}
          className="p-2 rounded hover:bg-gray-100 text-sm"
          title="Reset view"
        >
          Reset
        </button>
      </div>
      
      {/* Device selector */}
      <div className="flex items-center gap-2">
        <select
          value={previewDevice.name}
          onChange={(e) => {
            const device = DEVICE_PRESETS.find(d => d.name === e.target.value);
            if (device) setPreviewDevice(device);
          }}
          className="border border-gray-300 rounded px-2 py-1 text-sm"
        >
          {DEVICE_PRESETS.map(device => (
            <option key={device.name} value={device.name}>
              {device.name} ({device.width}×{device.height})
            </option>
          ))}
        </select>
      </div>
      
      <div className="flex-1" />
      
      {/* Panel toggles */}
      <div className="flex items-center gap-1">
        <button
          onClick={toggleLeftPanel}
          className={clsx(
            'p-2 rounded',
            leftOpen ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'
          )}
          title="Toggle tree panel"
        >
          <PanelLeftIcon />
        </button>
        <button
          onClick={toggleRightPanel}
          className={clsx(
            'p-2 rounded',
            rightOpen ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'
          )}
          title="Toggle inspector panel"
        >
          <PanelRightIcon />
        </button>
        <button
          onClick={togglePreview}
          className={clsx(
            'p-2 rounded',
            previewOpen ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'
          )}
          title="Toggle preview"
        >
          <EyeIcon />
        </button>
      </div>
      
      {/* Actions */}
      <div className="flex items-center gap-2">
        <button className="px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50">
          Preview
        </button>
        <button className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">
          Publish
        </button>
      </div>
    </header>
  );
}

// Icons
function UndoIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 7v6h6M3 13c1.5-4 5.5-6 10-5 4.5 1 7 5 6.5 9.5" />
    </svg>
  );
}

function RedoIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 7v6h-6M21 13c-1.5-4-5.5-6-10-5-4.5 1-7 5-6.5 9.5" />
    </svg>
  );
}

function PanelLeftIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <line x1="9" y1="3" x2="9" y2="21" />
    </svg>
  );
}

function PanelRightIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <line x1="15" y1="3" x2="15" y2="21" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
