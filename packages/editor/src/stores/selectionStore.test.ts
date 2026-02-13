import { describe, test, expect, beforeEach } from 'bun:test';
import { useSelectionStore } from './selectionStore';

describe('selectionStore', () => {
  beforeEach(() => {
    useSelectionStore.setState({ selectedIds: [], hoveredId: null });
  });

  describe('select', () => {
    test('selects a single item', () => {
      useSelectionStore.getState().select('item1');
      expect(useSelectionStore.getState().selectedIds).toEqual(['item1']);
    });

    test('replaces selection by default', () => {
      useSelectionStore.getState().select('item1');
      useSelectionStore.getState().select('item2');
      expect(useSelectionStore.getState().selectedIds).toEqual(['item2']);
    });

    test('adds to selection in additive mode', () => {
      useSelectionStore.getState().select('item1');
      useSelectionStore.getState().select('item2', true);
      expect(useSelectionStore.getState().selectedIds).toEqual(['item1', 'item2']);
    });

    test('deselects when additive and already selected', () => {
      useSelectionStore.getState().select('item1');
      useSelectionStore.getState().select('item1', true);
      expect(useSelectionStore.getState().selectedIds).toEqual([]);
    });
  });

  describe('selectMultiple', () => {
    test('selects multiple items', () => {
      useSelectionStore.getState().selectMultiple(['a', 'b', 'c']);
      expect(useSelectionStore.getState().selectedIds).toEqual(['a', 'b', 'c']);
    });
  });

  describe('clearSelection', () => {
    test('clears all selection', () => {
      useSelectionStore.getState().select('item1');
      useSelectionStore.getState().clearSelection();
      expect(useSelectionStore.getState().selectedIds).toEqual([]);
    });
  });

  describe('hover', () => {
    test('sets hovered item', () => {
      useSelectionStore.getState().hover('item1');
      expect(useSelectionStore.getState().hoveredId).toBe('item1');
    });

    test('clears hover with null', () => {
      useSelectionStore.getState().hover('item1');
      useSelectionStore.getState().hover(null);
      expect(useSelectionStore.getState().hoveredId).toBeNull();
    });
  });

  describe('isSelected', () => {
    test('returns true for selected item', () => {
      useSelectionStore.getState().select('item1');
      expect(useSelectionStore.getState().isSelected('item1')).toBe(true);
      expect(useSelectionStore.getState().isSelected('item2')).toBe(false);
    });
  });
});
