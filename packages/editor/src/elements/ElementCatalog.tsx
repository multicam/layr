import { useState } from 'react';
import { clsx } from 'clsx';

interface ElementDefinition {
  name: string;
  tag: string;
  categories: string[];
  description?: string;
  isVoid?: boolean;
  isPopular?: boolean;
}

const HTML_ELEMENTS: ElementDefinition[] = [
  // Popular
  { name: 'Div', tag: 'div', categories: ['container'], isPopular: true },
  { name: 'Span', tag: 'span', categories: ['text'], isPopular: true },
  { name: 'Paragraph', tag: 'p', categories: ['text'], isPopular: true },
  { name: 'Heading 1', tag: 'h1', categories: ['text'], isPopular: true },
  { name: 'Heading 2', tag: 'h2', categories: ['text'], isPopular: true },
  { name: 'Button', tag: 'button', categories: ['interactive'], isPopular: true },
  { name: 'Link', tag: 'a', categories: ['interactive'], isPopular: true },
  { name: 'Image', tag: 'img', categories: ['media'], isVoid: true, isPopular: true },
  { name: 'Input', tag: 'input', categories: ['form'], isVoid: true, isPopular: true },
  
  // Text
  { name: 'Heading 3', tag: 'h3', categories: ['text'] },
  { name: 'Heading 4', tag: 'h4', categories: ['text'] },
  { name: 'Heading 5', tag: 'h5', categories: ['text'] },
  { name: 'Heading 6', tag: 'h6', categories: ['text'] },
  { name: 'Strong', tag: 'strong', categories: ['text'] },
  { name: 'Emphasis', tag: 'em', categories: ['text'] },
  { name: 'Code', tag: 'code', categories: ['text'] },
  { name: 'Preformatted', tag: 'pre', categories: ['text'] },
  { name: 'Blockquote', tag: 'blockquote', categories: ['text'] },
  { name: 'List Item', tag: 'li', categories: ['list'] },
  { name: 'Ordered List', tag: 'ol', categories: ['list'] },
  { name: 'Unordered List', tag: 'ul', categories: ['list'] },
  
  // Layout
  { name: 'Section', tag: 'section', categories: ['semantic'] },
  { name: 'Article', tag: 'article', categories: ['semantic'] },
  { name: 'Header', tag: 'header', categories: ['semantic'] },
  { name: 'Footer', tag: 'footer', categories: ['semantic'] },
  { name: 'Nav', tag: 'nav', categories: ['semantic'] },
  { name: 'Aside', tag: 'aside', categories: ['semantic'] },
  { name: 'Main', tag: 'main', categories: ['semantic'] },
  
  // Form
  { name: 'Form', tag: 'form', categories: ['form'] },
  { name: 'Label', tag: 'label', categories: ['form'] },
  { name: 'Select', tag: 'select', categories: ['form'] },
  { name: 'Textarea', tag: 'textarea', categories: ['form'] },
  { name: 'Checkbox', tag: 'input', categories: ['form'] },
  { name: 'Radio', tag: 'input', categories: ['form'] },
  
  // Media
  { name: 'Video', tag: 'video', categories: ['media'] },
  { name: 'Audio', tag: 'audio', categories: ['media'] },
  { name: 'Iframe', tag: 'iframe', categories: ['media'] },
  
  // Tables
  { name: 'Table', tag: 'table', categories: ['table'] },
  { name: 'Table Row', tag: 'tr', categories: ['table'] },
  { name: 'Table Cell', tag: 'td', categories: ['table'] },
  { name: 'Table Header', tag: 'th', categories: ['table'] },
  
  // Misc
  { name: 'Horizontal Rule', tag: 'hr', categories: ['misc'], isVoid: true },
  { name: 'Line Break', tag: 'br', categories: ['misc'], isVoid: true },
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
  
  const filteredElements = HTML_ELEMENTS.filter(el => {
    const matchesSearch = search === '' || 
      el.name.toLowerCase().includes(search.toLowerCase()) ||
      el.tag.toLowerCase().includes(search.toLowerCase());
    
    const matchesCategory = category === 'all' ||
      (category === 'popular' && el.isPopular) ||
      el.categories.includes(category);
    
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
              key={el.tag}
              onClick={() => onSelect?.(el)}
              className="flex flex-col items-start p-2 rounded hover:bg-gray-100 text-left"
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('text/plain', JSON.stringify({
                  type: 'element',
                  tag: el.tag,
                  isVoid: el.isVoid,
                }));
              }}
            >
              <span className="text-xs text-gray-400">&lt;{el.tag}&gt;</span>
              <span className="text-sm font-medium">{el.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export { HTML_ELEMENTS };
export type { ElementDefinition };
