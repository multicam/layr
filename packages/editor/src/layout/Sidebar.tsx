import { useState } from 'react';
import { clsx } from 'clsx';
import { ComponentTree } from '../tree/ComponentTree';
import { ElementCatalog } from '../elements';

type Tab = 'tree' | 'elements';

export function Sidebar() {
  const [tab, setTab] = useState<Tab>('tree');
  
  return (
    <div className="h-full flex flex-col bg-white">
      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setTab('tree')}
          className={clsx(
            'flex-1 px-3 py-2 text-sm font-medium',
            tab === 'tree'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          )}
        >
          Tree
        </button>
        <button
          onClick={() => setTab('elements')}
          className={clsx(
            'flex-1 px-3 py-2 text-sm font-medium',
            tab === 'elements'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          )}
        >
          Elements
        </button>
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {tab === 'tree' && <ComponentTree />}
        {tab === 'elements' && <ElementCatalog />}
      </div>
    </div>
  );
}
