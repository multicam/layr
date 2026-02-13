import { useState, useEffect } from 'react';
import { clsx } from 'clsx';
import type { NodeModel } from '@layr/types';

// Element definition types
export interface ElementDefinition {
  metadata: {
    name: string;
    categories: string[];
    description?: string;
    isVoid?: boolean;
    isPopular?: boolean;
    permittedChildren?: string[];
    permittedParents?: string[];
    interfaces?: string[];
  };
  element: {
    type: 'nodes';
    source: 'catalog';
    nodes: Record<string, NodeModel>;
  };
}

// Built-in elements (would load from JSON in production)
const BUILTIN_ELEMENTS: ElementDefinition[] = [
  // Popular elements
  {
    metadata: {
      name: 'div',
      categories: ['container'],
      description: 'Container element',
      isPopular: true,
    },
    element: {
      type: 'nodes',
      source: 'catalog',
      nodes: {
        root: { id: 'root', type: 'element', tag: 'div', children: [] },
      },
    },
  },
  {
    metadata: {
      name: 'span',
      categories: ['text'],
      description: 'Inline container',
      isPopular: true,
    },
    element: {
      type: 'nodes',
      source: 'catalog',
      nodes: {
        root: { id: 'root', type: 'element', tag: 'span', children: [] },
      },
    },
  },
  {
    metadata: {
      name: 'p',
      categories: ['text'],
      description: 'Paragraph',
      isPopular: true,
    },
    element: {
      type: 'nodes',
      source: 'catalog',
      nodes: {
        root: { id: 'root', type: 'element', tag: 'p', children: ['text'] },
        text: { id: 'text', type: 'text', value: { type: 'value', value: 'Text' } },
      },
    },
  },
  {
    metadata: {
      name: 'h1',
      categories: ['text'],
      description: 'Heading 1',
      isPopular: true,
    },
    element: {
      type: 'nodes',
      source: 'catalog',
      nodes: {
        root: { id: 'root', type: 'element', tag: 'h1', children: ['text'] },
        text: { id: 'text', type: 'text', value: { type: 'value', value: 'Heading' } },
      },
    },
  },
  {
    metadata: {
      name: 'h2',
      categories: ['text'],
      description: 'Heading 2',
      isPopular: true,
    },
    element: {
      type: 'nodes',
      source: 'catalog',
      nodes: {
        root: { id: 'root', type: 'element', tag: 'h2', children: ['text'] },
        text: { id: 'text', type: 'text', value: { type: 'value', value: 'Heading' } },
      },
    },
  },
  {
    metadata: {
      name: 'button',
      categories: ['interactive'],
      description: 'Button',
      isPopular: true,
    },
    element: {
      type: 'nodes',
      source: 'catalog',
      nodes: {
        root: {
          id: 'root',
          type: 'element',
          tag: 'button',
          attrs: { type: { type: 'value', value: 'button' } },
          children: ['text'],
        },
        text: { id: 'text', type: 'text', value: { type: 'value', value: 'Button' } },
      },
    },
  },
  {
    metadata: {
      name: 'a',
      categories: ['interactive'],
      description: 'Link',
      isPopular: true,
    },
    element: {
      type: 'nodes',
      source: 'catalog',
      nodes: {
        root: {
          id: 'root',
          type: 'element',
          tag: 'a',
          attrs: { href: { type: 'value', value: '/' } },
          children: ['text'],
        },
        text: { id: 'text', type: 'text', value: { type: 'value', value: 'Link' } },
      },
    },
  },
  {
    metadata: {
      name: 'img',
      categories: ['media'],
      description: 'Image',
      isPopular: true,
      isVoid: true,
    },
    element: {
      type: 'nodes',
      source: 'catalog',
      nodes: {
        root: {
          id: 'root',
          type: 'element',
          tag: 'img',
          attrs: {
            src: { type: 'value', value: '' },
            alt: { type: 'value', value: '' },
          },
          children: [],
        },
      },
    },
  },
  {
    metadata: {
      name: 'input',
      categories: ['form'],
      description: 'Input',
      isPopular: true,
      isVoid: true,
    },
    element: {
      type: 'nodes',
      source: 'catalog',
      nodes: {
        root: {
          id: 'root',
          type: 'element',
          tag: 'input',
          attrs: {
            type: { type: 'value', value: 'text' },
            placeholder: { type: 'value', value: '' },
          },
          children: [],
        },
      },
    },
  },
  
  // Text elements
  {
    metadata: { name: 'h3', categories: ['text'], description: 'Heading 3' },
    element: { type: 'nodes', source: 'catalog', nodes: { root: { id: 'root', type: 'element', tag: 'h3', children: [] } } },
  },
  {
    metadata: { name: 'h4', categories: ['text'], description: 'Heading 4' },
    element: { type: 'nodes', source: 'catalog', nodes: { root: { id: 'root', type: 'element', tag: 'h4', children: [] } } },
  },
  {
    metadata: { name: 'h5', categories: ['text'], description: 'Heading 5' },
    element: { type: 'nodes', source: 'catalog', nodes: { root: { id: 'root', type: 'element', tag: 'h5', children: [] } } },
  },
  {
    metadata: { name: 'h6', categories: ['text'], description: 'Heading 6' },
    element: { type: 'nodes', source: 'catalog', nodes: { root: { id: 'root', type: 'element', tag: 'h6', children: [] } } },
  },
  {
    metadata: { name: 'strong', categories: ['text'], description: 'Strong emphasis' },
    element: { type: 'nodes', source: 'catalog', nodes: { root: { id: 'root', type: 'element', tag: 'strong', children: [] } } },
  },
  {
    metadata: { name: 'em', categories: ['text'], description: 'Emphasis' },
    element: { type: 'nodes', source: 'catalog', nodes: { root: { id: 'root', type: 'element', tag: 'em', children: [] } } },
  },
  
  // Layout
  {
    metadata: { name: 'section', categories: ['semantic'], description: 'Section' },
    element: { type: 'nodes', source: 'catalog', nodes: { root: { id: 'root', type: 'element', tag: 'section', children: [] } } },
  },
  {
    metadata: { name: 'article', categories: ['semantic'], description: 'Article' },
    element: { type: 'nodes', source: 'catalog', nodes: { root: { id: 'root', type: 'element', tag: 'article', children: [] } } },
  },
  {
    metadata: { name: 'header', categories: ['semantic'], description: 'Header' },
    element: { type: 'nodes', source: 'catalog', nodes: { root: { id: 'root', type: 'element', tag: 'header', children: [] } } },
  },
  {
    metadata: { name: 'footer', categories: ['semantic'], description: 'Footer' },
    element: { type: 'nodes', source: 'catalog', nodes: { root: { id: 'root', type: 'element', tag: 'footer', children: [] } } },
  },
  {
    metadata: { name: 'nav', categories: ['semantic'], description: 'Navigation' },
    element: { type: 'nodes', source: 'catalog', nodes: { root: { id: 'root', type: 'element', tag: 'nav', children: [] } } },
  },
  {
    metadata: { name: 'aside', categories: ['semantic'], description: 'Aside' },
    element: { type: 'nodes', source: 'catalog', nodes: { root: { id: 'root', type: 'element', tag: 'aside', children: [] } } },
  },
  {
    metadata: { name: 'main', categories: ['semantic'], description: 'Main content' },
    element: { type: 'nodes', source: 'catalog', nodes: { root: { id: 'root', type: 'element', tag: 'main', children: [] } } },
  },
  
  // Lists
  {
    metadata: { name: 'ul', categories: ['list'], description: 'Unordered list' },
    element: { type: 'nodes', source: 'catalog', nodes: { root: { id: 'root', type: 'element', tag: 'ul', children: [] } } },
  },
  {
    metadata: { name: 'ol', categories: ['list'], description: 'Ordered list' },
    element: { type: 'nodes', source: 'catalog', nodes: { root: { id: 'root', type: 'element', tag: 'ol', children: [] } } },
  },
  {
    metadata: { name: 'li', categories: ['list'], description: 'List item' },
    element: { type: 'nodes', source: 'catalog', nodes: { root: { id: 'root', type: 'element', tag: 'li', children: [] } } },
  },
  
  // Form
  {
    metadata: { name: 'form', categories: ['form'], description: 'Form' },
    element: { type: 'nodes', source: 'catalog', nodes: { root: { id: 'root', type: 'element', tag: 'form', children: [] } } },
  },
  {
    metadata: { name: 'label', categories: ['form'], description: 'Label' },
    element: { type: 'nodes', source: 'catalog', nodes: { root: { id: 'root', type: 'element', tag: 'label', children: [] } } },
  },
  {
    metadata: { name: 'textarea', categories: ['form'], description: 'Text area' },
    element: { type: 'nodes', source: 'catalog', nodes: { root: { id: 'root', type: 'element', tag: 'textarea', children: [] } } },
  },
  {
    metadata: { name: 'select', categories: ['form'], description: 'Select' },
    element: { type: 'nodes', source: 'catalog', nodes: { root: { id: 'root', type: 'element', tag: 'select', children: [] } } },
  },
  {
    metadata: { name: 'option', categories: ['form'], description: 'Option', isVoid: true },
    element: { type: 'nodes', source: 'catalog', nodes: { root: { id: 'root', type: 'element', tag: 'option', children: [] } } },
  },
  
  // Media
  {
    metadata: { name: 'video', categories: ['media'], description: 'Video' },
    element: { type: 'nodes', source: 'catalog', nodes: { root: { id: 'root', type: 'element', tag: 'video', children: [] } } },
  },
  {
    metadata: { name: 'audio', categories: ['media'], description: 'Audio' },
    element: { type: 'nodes', source: 'catalog', nodes: { root: { id: 'root', type: 'element', tag: 'audio', children: [] } } },
  },
  {
    metadata: { name: 'iframe', categories: ['media'], description: 'Iframe' },
    element: { type: 'nodes', source: 'catalog', nodes: { root: { id: 'root', type: 'element', tag: 'iframe', children: [] } } },
  },
  
  // Tables
  {
    metadata: { name: 'table', categories: ['table'], description: 'Table' },
    element: { type: 'nodes', source: 'catalog', nodes: { root: { id: 'root', type: 'element', tag: 'table', children: [] } } },
  },
  {
    metadata: { name: 'tr', categories: ['table'], description: 'Table row' },
    element: { type: 'nodes', source: 'catalog', nodes: { root: { id: 'root', type: 'element', tag: 'tr', children: [] } } },
  },
  {
    metadata: { name: 'td', categories: ['table'], description: 'Table cell' },
    element: { type: 'nodes', source: 'catalog', nodes: { root: { id: 'root', type: 'element', tag: 'td', children: [] } } },
  },
  {
    metadata: { name: 'th', categories: ['table'], description: 'Table header' },
    element: { type: 'nodes', source: 'catalog', nodes: { root: { id: 'root', type: 'element', tag: 'th', children: [] } } },
  },
  
  // Misc
  {
    metadata: { name: 'br', categories: ['misc'], description: 'Line break', isVoid: true },
    element: { type: 'nodes', source: 'catalog', nodes: { root: { id: 'root', type: 'element', tag: 'br', children: [] } } },
  },
  {
    metadata: { name: 'hr', categories: ['misc'], description: 'Horizontal rule', isVoid: true },
    element: { type: 'nodes', source: 'catalog', nodes: { root: { id: 'root', type: 'element', tag: 'hr', children: [] } } },
  },
];

const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'popular', label: 'Popular' },
  { id: 'text', label: 'Text' },
  { id: 'container', label: 'Containers' },
  { id: 'form', label: 'Forms' },
  { id: 'media', label: 'Media' },
  { id: 'semantic', label: 'Semantic' },
  { id: 'list', label: 'Lists' },
  { id: 'table', label: 'Tables' },
];

interface ElementCatalogProps {
  onSelect?: (element: ElementDefinition) => void;
}

export function ElementCatalog({ onSelect }: ElementCatalogProps) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  
  const filteredElements = BUILTIN_ELEMENTS.filter(el => {
    const matchesSearch = search === '' || 
      el.metadata.name.toLowerCase().includes(search.toLowerCase()) ||
      (el.metadata.description?.toLowerCase().includes(search.toLowerCase()));
    
    const matchesCategory = category === 'all' ||
      (category === 'popular' && el.metadata.isPopular) ||
      el.metadata.categories.includes(category);
    
    return matchesSearch && matchesCategory;
  });
  
  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="p-2 border-b border-gray-200">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search elements..."
          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded"
        />
      </div>
      
      {/* Categories */}
      <div className="flex flex-wrap gap-1 p-2 border-b border-gray-200">
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => setCategory(cat.id)}
            className={clsx(
              'px-2 py-0.5 text-xs rounded',
              category === cat.id
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            )}
          >
            {cat.label}
          </button>
        ))}
      </div>
      
      {/* Element list */}
      <div className="flex-1 overflow-auto p-2">
        <div className="grid grid-cols-2 gap-1">
          {filteredElements.map(el => (
            <button
              key={el.metadata.name}
              onClick={() => onSelect?.(el)}
              className="flex flex-col items-start p-2 rounded hover:bg-gray-100 text-left"
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('application/json', JSON.stringify({
                  type: 'element',
                  definition: el,
                }));
              }}
            >
              <span className="text-xs text-gray-400">&lt;{el.metadata.name}&gt;</span>
              <span className="text-sm font-medium">{el.metadata.name}</span>
              {el.metadata.isVoid && (
                <span className="text-xs text-gray-400">void</span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export { BUILTIN_ELEMENTS };
