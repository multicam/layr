/**
 * Require Extension Rule
 * Detects when required extensions are not installed
 *
 * Extensions provide additional functionality and are referenced in the project.
 */

import type { Rule } from '../../types';
import type { Project } from '@layr/types';

/**
 * Check if an extension is available in the project
 */
function isExtensionAvailable(project: any, extensionName: string): boolean {
  // Check project extensions
  if (project.extensions) {
    for (const ext of project.extensions) {
      if (ext?.name === extensionName || ext?.packageName === extensionName) {
        return true;
      }
    }
  }

  // Check project plugins (alternative name)
  if (project.plugins) {
    for (const plugin of project.plugins) {
      if (plugin?.name === extensionName || plugin?.packageName === extensionName) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Find extension references in the project
 */
function findExtensionReferences(files: any): string[] {
  const references = new Set<string>();

  // Check project-level extensions/plugins
  if (files.project?.extensions) {
    for (const ext of files.project.extensions) {
      if (ext?.requires) {
        for (const req of ext.requires) {
          if (typeof req === 'string') {
            references.add(req);
          }
        }
      }
    }
  }

  // Check components for extension usage
  for (const [compName, component] of Object.entries(files.components || {})) {
    if (!component) continue;

    // Check if component uses external formulas from extensions
    if (component.formulas) {
      for (const formula of Object.values(component.formulas)) {
        if (!formula) continue;
        // External formulas often have prefixed names like "@extension/formula"
        const formulaName = (formula as any).name || '';
        if (formulaName.startsWith('@') && formulaName.includes('/')) {
          const extName = formulaName.split('/')[0];
          references.add(extName);
        }
      }
    }

    // Check for custom code that might require extensions
    if ((component as any).customCode?.packages) {
      for (const pkg of (component as any).customCode.packages) {
        if (typeof pkg === 'string' && (pkg.startsWith('@') || !pkg.startsWith('@layr/'))) {
          references.add(pkg);
        }
      }
    }
  }

  // Check project formulas for extension references
  if (files.formulas) {
    for (const formula of Object.values(files.formulas)) {
      if (!formula) continue;
      const formulaName = (formula as any).name || '';
      if (formulaName.startsWith('@') && formulaName.includes('/')) {
        const extName = formulaName.split('/')[0];
        references.add(extName);
      }
    }
  }

  return Array.from(references);
}

export const requireExtensionRule: Rule<{ extension: string }> = {
  code: 'require extension',
  level: 'info',
  category: 'misc',
  visit: (report, ctx) => {
    const { files } = ctx;

    // Find all extension references in the project
    const referencedExtensions = findExtensionReferences(files);

    // Check which extensions are missing
    for (const extName of referencedExtensions) {
      if (!isExtensionAvailable(files.project, extName)) {
        report({ extension: extName }, ['project']);
      }
    }
  },
};
