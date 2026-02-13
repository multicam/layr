import { useState, useEffect, useRef } from 'react';
import { clsx } from 'clsx';

interface AutocompleteItem {
  label: string;
  kind: 'variable' | 'attribute' | 'formula' | 'path';
  insertText: string;
  documentation?: string;
}

interface AutocompleteProps {
  query: string;
  position: { x: number; y: number };
  onSelect: (item: AutocompleteItem) => void;
  onClose: () => void;
  items?: AutocompleteItem[];
}

const DEFAULT_ITEMS: AutocompleteItem[] = [
  { label: 'Variables', kind: 'path', insertText: 'Variables.', documentation: 'Component variables' },
  { label: 'Attributes', kind: 'path', insertText: 'Attributes.', documentation: 'Component attributes' },
  { label: 'Apis', kind: 'path', insertText: 'Apis.', documentation: 'API data' },
  { label: 'ListItem', kind: 'path', insertText: 'ListItem.', documentation: 'Current list item' },
  
  // Common formulas
  { label: '@toddle/if', kind: 'formula', insertText: '@toddle/if(condition, then, else)', documentation: 'Conditional' },
  { label: '@toddle/concatenate', kind: 'formula', insertText: '@toddle/concatenate(a, b)', documentation: 'Join strings' },
  { label: '@toddle/add', kind: 'formula', insertText: '@toddle/add(a, b)', documentation: 'Add numbers' },
  { label: '@toddle/multiply', kind: 'formula', insertText: '@toddle/multiply(a, b)', documentation: 'Multiply numbers' },
  { label: '@toddle/map', kind: 'formula', insertText: '@toddle/map(array, fn)', documentation: 'Map over array' },
  { label: '@toddle/filter', kind: 'formula', insertText: '@toddle/filter(array, fn)', documentation: 'Filter array' },
];

export function Autocomplete({ query, position, onSelect, onClose, items = DEFAULT_ITEMS }: AutocompleteProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Filter items by query
  const filteredItems = items.filter(item =>
    item.label.toLowerCase().includes(query.toLowerCase())
  );
  
  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(i => Math.min(i + 1, filteredItems.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(i => Math.max(i - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredItems[selectedIndex]) {
            onSelect(filteredItems[selectedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [filteredItems, selectedIndex, onSelect, onClose]);
  
  // Click outside to close
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [onClose]);
  
  if (filteredItems.length === 0) return null;
  
  return (
    <div
      ref={containerRef}
      className="fixed bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-auto z-50"
      style={{
        left: position.x,
        top: position.y,
        minWidth: 200,
      }}
    >
      {filteredItems.map((item, index) => (
        <div
          key={item.label}
          className={clsx(
            'px-3 py-2 cursor-pointer flex items-center gap-2',
            index === selectedIndex ? 'bg-blue-50' : 'hover:bg-gray-50'
          )}
          onClick={() => onSelect(item)}
          onMouseEnter={() => setSelectedIndex(index)}
        >
          <span className={clsx(
            'w-4 h-4 text-xs flex items-center justify-center rounded',
            item.kind === 'formula' && 'bg-purple-100 text-purple-600',
            item.kind === 'variable' && 'bg-blue-100 text-blue-600',
            item.kind === 'attribute' && 'bg-green-100 text-green-600',
            item.kind === 'path' && 'bg-gray-100 text-gray-600',
          )}>
            {item.kind === 'formula' ? 'f' : item.kind === 'variable' ? 'v' : item.kind === 'attribute' ? 'a' : '•'}
          </span>
          <span className="text-sm font-mono">{item.label}</span>
        </div>
      ))}
    </div>
  );
}

export type { AutocompleteItem };
