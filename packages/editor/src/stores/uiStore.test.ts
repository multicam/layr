import { describe, test, expect, beforeEach } from 'bun:test';
import { useUIStore, DEVICE_PRESETS } from './uiStore';

describe('uiStore', () => {
  beforeEach(() => {
    useUIStore.setState({
      zoom: 1,
      panX: 0,
      panY: 0,
      leftPanelOpen: true,
      rightPanelOpen: true,
      previewOpen: true,
      activeTab: 'properties',
      previewDevice: DEVICE_PRESETS[5],
      previewScale: 1,
    });
  });

  describe('setZoom', () => {
    test('sets zoom level', () => {
      useUIStore.getState().setZoom(2);
      expect(useUIStore.getState().zoom).toBe(2);
    });

    test('clamps to minimum', () => {
      useUIStore.getState().setZoom(0.05);
      expect(useUIStore.getState().zoom).toBe(0.1);
    });

    test('clamps to maximum', () => {
      useUIStore.getState().setZoom(5);
      expect(useUIStore.getState().zoom).toBe(4);
    });
  });

  describe('setPan', () => {
    test('sets pan position', () => {
      useUIStore.getState().setPan(100, 200);
      expect(useUIStore.getState().panX).toBe(100);
      expect(useUIStore.getState().panY).toBe(200);
    });
  });

  describe('resetView', () => {
    test('resets zoom and pan', () => {
      useUIStore.getState().setZoom(2);
      useUIStore.getState().setPan(100, 100);
      useUIStore.getState().resetView();

      expect(useUIStore.getState().zoom).toBe(1);
      expect(useUIStore.getState().panX).toBe(0);
      expect(useUIStore.getState().panY).toBe(0);
    });
  });

  describe('toggle panels', () => {
    test('toggles left panel', () => {
      const before = useUIStore.getState().leftPanelOpen;
      useUIStore.getState().toggleLeftPanel();
      expect(useUIStore.getState().leftPanelOpen).toBe(!before);
    });

    test('toggles right panel', () => {
      const before = useUIStore.getState().rightPanelOpen;
      useUIStore.getState().toggleRightPanel();
      expect(useUIStore.getState().rightPanelOpen).toBe(!before);
    });

    test('toggles preview', () => {
      const before = useUIStore.getState().previewOpen;
      useUIStore.getState().togglePreview();
      expect(useUIStore.getState().previewOpen).toBe(!before);
    });
  });

  describe('setActiveTab', () => {
    test('changes active tab', () => {
      useUIStore.getState().setActiveTab('styles');
      expect(useUIStore.getState().activeTab).toBe('styles');
    });

    test('can set all tab types', () => {
      const tabs = ['properties', 'styles', 'events', 'advanced', 'animation'] as const;
      for (const tab of tabs) {
        useUIStore.getState().setActiveTab(tab);
        expect(useUIStore.getState().activeTab).toBe(tab);
      }
    });
  });

  describe('setPreviewDevice', () => {
    test('changes preview device', () => {
      const device = DEVICE_PRESETS[0];
      useUIStore.getState().setPreviewDevice(device);
      expect(useUIStore.getState().previewDevice).toBe(device);
    });
  });

  describe('setPreviewScale', () => {
    test('sets preview scale', () => {
      useUIStore.getState().setPreviewScale(0.5);
      expect(useUIStore.getState().previewScale).toBe(0.5);
    });

    test('clamps to minimum scale', () => {
      useUIStore.getState().setPreviewScale(0.1);
      expect(useUIStore.getState().previewScale).toBe(0.25);
    });

    test('clamps to maximum scale', () => {
      useUIStore.getState().setPreviewScale(3);
      expect(useUIStore.getState().previewScale).toBe(2);
    });
  });
});

describe('DEVICE_PRESETS', () => {
  test('contains expected presets', () => {
    expect(DEVICE_PRESETS.length).toBe(7);
    expect(DEVICE_PRESETS[0].name).toBe('iPhone SE');
    expect(DEVICE_PRESETS[5].name).toBe('Desktop HD');
  });

  test('all presets have required properties', () => {
    for (const preset of DEVICE_PRESETS) {
      expect(preset.name).toBeDefined();
      expect(preset.width).toBeGreaterThan(0);
      expect(preset.height).toBeGreaterThan(0);
    }
  });
});
