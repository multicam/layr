import { clsx } from 'clsx';
import { themeDefinitions, getThemePreviewColors } from '@layr/themes';
import { useProjectStore } from '../stores';
import type { ProjectThemeConfig } from '@layr/types';

export function ThemeSelector() {
  const project = useProjectStore(s => s.project);
  const setThemeConfig = useProjectStore(s => s.setThemeConfig);
  
  const currentTheme = project?.files?.config?.theme?.themeId || 'minimal';
  const currentVariant = project?.files?.config?.theme?.activeVariant || 'light';
  
  const handleSelectTheme = (themeId: string) => {
    const themeDef = themeDefinitions.find(t => t.id === themeId);
    if (!themeDef) return;
    
    const config: ProjectThemeConfig = {
      themeId,
      activeVariant: currentVariant,
      followSystem: true,
    };
    setThemeConfig(config);
  };
  
  const handleSelectVariant = (variant: 'light' | 'dark') => {
    const config: ProjectThemeConfig = {
      themeId: currentTheme,
      activeVariant: variant,
      followSystem: false,
    };
    setThemeConfig(config);
  };
  
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium text-gray-900 mb-3">Theme</h3>
        <div className="grid grid-cols-2 gap-2">
          {themeDefinitions.map(theme => {
            const colors = getThemePreviewColors(theme.id);
            const isSelected = currentTheme === theme.id;
            
            return (
              <button
                key={theme.id}
                onClick={() => handleSelectTheme(theme.id)}
                className={clsx(
                  'p-3 rounded-lg border-2 text-left transition-all',
                  isSelected
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                )}
              >
                {/* Color preview */}
                <div className="flex gap-1 mb-2 h-6 rounded overflow-hidden">
                  {colors && (
                    <>
                      <div 
                        className="flex-1" 
                        style={{ backgroundColor: colors.background }}
                      />
                      <div 
                        className="w-6" 
                        style={{ backgroundColor: colors.accent }}
                      />
                    </>
                  )}
                </div>
                
                <div className="text-sm font-medium text-gray-900">
                  {theme.displayName}
                </div>
                <div className="text-xs text-gray-500 truncate">
                  {theme.description}
                </div>
              </button>
            );
          })}
        </div>
      </div>
      
      {/* Variant selector */}
      <div>
        <h3 className="text-sm font-medium text-gray-900 mb-3">Appearance</h3>
        <div className="flex gap-2">
          <button
            onClick={() => handleSelectVariant('light')}
            className={clsx(
              'flex-1 py-2 px-3 rounded-lg border-2 text-sm font-medium transition-all',
              currentVariant === 'light'
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-200 hover:border-gray-300 text-gray-700'
            )}
          >
            <span className="mr-2">☀️</span>
            Light
          </button>
          <button
            onClick={() => handleSelectVariant('dark')}
            className={clsx(
              'flex-1 py-2 px-3 rounded-lg border-2 text-sm font-medium transition-all',
              currentVariant === 'dark'
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-200 hover:border-gray-300 text-gray-700'
            )}
          >
            <span className="mr-2">🌙</span>
            Dark
          </button>
        </div>
      </div>
      
      {/* Current theme info */}
      <div className="pt-3 border-t border-gray-200">
        <div className="text-xs text-gray-500">
          Theme changes apply to the entire project. Each theme includes light and dark variants.
        </div>
      </div>
    </div>
  );
}
