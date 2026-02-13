import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Tab = 'properties' | 'styles' | 'events' | 'advanced' | 'animation';

interface DevicePreset {
  name: string;
  width: number;
  height: number;
}

export const DEVICE_PRESETS: DevicePreset[] = [
  { name: 'iPhone SE', width: 375, height: 667 },
  { name: 'iPhone 14', width: 390, height: 844 },
  { name: 'iPhone 14 Pro Max', width: 430, height: 932 },
  { name: 'iPad Mini', width: 768, height: 1024 },
  { name: 'iPad Pro', width: 1024, height: 1366 },
  { name: 'Desktop HD', width: 1440, height: 900 },
  { name: 'Desktop 4K', width: 2560, height: 1440 },
];

interface UIState {
  // Canvas
  zoom: number;
  panX: number;
  panY: number;
  
  // Panels
  leftPanelOpen: boolean;
  rightPanelOpen: boolean;
  previewOpen: boolean;
  
  // Inspector
  activeTab: Tab;
  
  // Preview
  previewDevice: DevicePreset;
  previewScale: number;
  
  // Actions
  setZoom: (zoom: number) => void;
  setPan: (x: number, y: number) => void;
  resetView: () => void;
  
  toggleLeftPanel: () => void;
  toggleRightPanel: () => void;
  togglePreview: () => void;
  
  setActiveTab: (tab: Tab) => void;
  
  setPreviewDevice: (device: DevicePreset) => void;
  setPreviewScale: (scale: number) => void;
}

const DEFAULT_DEVICE = DEVICE_PRESETS[5]; // Desktop HD

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      // Canvas
      zoom: 1,
      panX: 0,
      panY: 0,
      
      // Panels
      leftPanelOpen: true,
      rightPanelOpen: true,
      previewOpen: true,
      
      // Inspector
      activeTab: 'properties',
      
      // Preview
      previewDevice: DEFAULT_DEVICE,
      previewScale: 1,
      
      // Actions
      setZoom: (zoom) => set({ zoom: Math.max(0.1, Math.min(4, zoom)) }),
      setPan: (panX, panY) => set({ panX, panY }),
      resetView: () => set({ zoom: 1, panX: 0, panY: 0 }),
      
      toggleLeftPanel: () => set((s) => ({ leftPanelOpen: !s.leftPanelOpen })),
      toggleRightPanel: () => set((s) => ({ rightPanelOpen: !s.rightPanelOpen })),
      togglePreview: () => set((s) => ({ previewOpen: !s.previewOpen })),
      
      setActiveTab: (activeTab) => set({ activeTab }),
      
      setPreviewDevice: (previewDevice) => set({ previewDevice }),
      setPreviewScale: (previewScale) => set({ previewScale: Math.max(0.25, Math.min(2, previewScale)) }),
    }),
    {
      name: 'layr-editor-ui',
      partialize: (state) => ({
        leftPanelOpen: state.leftPanelOpen,
        rightPanelOpen: state.rightPanelOpen,
        previewOpen: state.previewOpen,
        activeTab: state.activeTab,
        previewDevice: state.previewDevice,
      }),
    }
  )
);

// Selector hooks
export const useZoom = () => useUIStore(s => s.zoom);
export const usePan = () => useUIStore(
  s => ({ x: s.panX, y: s.panY }),
  (a, b) => a.x === b.x && a.y === b.y
);
export const useActiveTab = () => useUIStore(s => s.activeTab);
export const usePreviewDevice = () => useUIStore(s => s.previewDevice);
