/**
 * Cycle Detection Utilities
 * 
 * Prevents infinite loops from circular references in formulas, packages, and workflows.
 * 
 * @module @layr/core/cycle-detection
 */

import { checkLimit } from './limits';

/**
 * Error thrown when a cycle is detected
 */
export class CycleDetectedError extends Error {
  constructor(
    public readonly type: 'formula' | 'package' | 'workflow' | 'component',
    public readonly path: string[],
    public readonly cycleStart: string
  ) {
    super(`Circular ${type} reference detected: ${path.join(' → ')} → ${cycleStart}`);
    this.name = 'CycleDetectedError';
  }
}

/**
 * Cycle detection context for formula evaluation
 */
export class FormulaCycleDetector {
  private stack: Set<string> = new Set();
  private path: string[] = [];

  /**
   * Enter a formula evaluation context
   * @throws CycleDetectedError if the formula is already being evaluated
   */
  enter(formulaKey: string): void {
    const fullKey = `formula:${formulaKey}`;
    
    if (this.stack.has(fullKey)) {
      throw new CycleDetectedError(
        'formula',
        [...this.path, fullKey],
        fullKey
      );
    }

    checkLimit('formula', 'maxDepth', this.stack.size);

    this.stack.add(fullKey);
    this.path.push(fullKey);
  }

  /**
   * Exit a formula evaluation context
   */
  exit(formulaKey: string): void {
    const fullKey = `formula:${formulaKey}`;
    this.stack.delete(fullKey);
    
    // Remove from path
    const index = this.path.lastIndexOf(fullKey);
    if (index !== -1) {
      this.path.splice(index);
    }
  }

  /**
   * Execute a function with cycle detection
   */
  static withDetection<T>(key: string, fn: () => T, detector?: FormulaCycleDetector): T {
    detector = detector ?? new FormulaCycleDetector();
    detector.enter(key);
    try {
      return fn();
    } finally {
      detector.exit(key);
    }
  }

  /**
   * Get current depth
   */
  get depth(): number {
    return this.stack.size;
  }

  /**
   * Get current path for error messages
   */
  get currentPath(): string[] {
    return [...this.path];
  }
}

/**
 * Cycle detection for package dependencies
 */
export class PackageCycleDetector {
  /**
   * Detect cycles in package dependency graph
   * @returns Array of cycle paths found, empty if no cycles
   */
  static detectCycles(
    packages: Map<string, Set<string>>
  ): string[][] {
    const cycles: string[][] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const currentPath: string[] = [];

    function dfs(packageName: string): void {
      visited.add(packageName);
      recursionStack.add(packageName);
      currentPath.push(packageName);

      const dependencies = packages.get(packageName);
      if (dependencies) {
        for (const dep of dependencies) {
          if (!visited.has(dep)) {
            dfs(dep);
          } else if (recursionStack.has(dep)) {
            // Found a cycle
            const cycleStart = currentPath.indexOf(dep);
            const cycle = [...currentPath.slice(cycleStart), dep];
            cycles.push(cycle);
          }
        }
      }

      currentPath.pop();
      recursionStack.delete(packageName);
    }

    for (const packageName of packages.keys()) {
      if (!visited.has(packageName)) {
        dfs(packageName);
      }
    }

    return cycles;
  }

  /**
   * Validate package dependencies and throw if cycles found
   * @throws CycleDetectedError if any cycles are detected
   */
  static validate(packages: Map<string, Set<string>>): void {
    const cycles = this.detectCycles(packages);
    if (cycles.length > 0) {
      throw new CycleDetectedError(
        'package',
        cycles[0].slice(0, -1),
        cycles[0][cycles[0].length - 1]
      );
    }
  }

  /**
   * Topologically sort packages (dependencies first)
   * @returns Array of package names in dependency order
   * @throws CycleDetectedError if cycles prevent sorting
   */
  static topologicalSort(packages: Map<string, Set<string>>): string[] {
    this.validate(packages);
    
    const result: string[] = [];
    const visited = new Set<string>();

    function visit(name: string): void {
      if (visited.has(name)) return;
      visited.add(name);

      const deps = packages.get(name);
      if (deps) {
        for (const dep of deps) {
          visit(dep);
        }
      }

      result.push(name);
    }

    for (const name of packages.keys()) {
      visit(name);
    }

    return result;
  }
}

/**
 * Cycle detection for workflow execution
 */
export class WorkflowCycleDetector {
  private activeWorkflows: Map<string, number> = new Map();
  private readonly maxRecursion: number;

  constructor(maxRecursion = 10) {
    this.maxRecursion = maxRecursion;
  }

  /**
   * Check if a workflow can be entered
   * @returns true if safe, false if would cause deep recursion
   */
  canEnter(workflowKey: string): boolean {
    const depth = this.activeWorkflows.get(workflowKey) ?? 0;
    return depth < this.maxRecursion;
  }

  /**
   * Enter a workflow context
   * @throws CycleDetectedError if max recursion exceeded
   */
  enter(workflowKey: string): void {
    const depth = this.activeWorkflows.get(workflowKey) ?? 0;
    
    if (depth >= this.maxRecursion) {
      throw new CycleDetectedError(
        'workflow',
        [workflowKey],
        workflowKey
      );
    }

    this.activeWorkflows.set(workflowKey, depth + 1);
  }

  /**
   * Exit a workflow context
   */
  exit(workflowKey: string): void {
    const depth = this.activeWorkflows.get(workflowKey) ?? 0;
    if (depth <= 1) {
      this.activeWorkflows.delete(workflowKey);
    } else {
      this.activeWorkflows.set(workflowKey, depth - 1);
    }
  }

  /**
   * Get current recursion depth for a workflow
   */
  getDepth(workflowKey: string): number {
    return this.activeWorkflows.get(workflowKey) ?? 0;
  }

  /**
   * Check if any workflow is currently active
   */
  hasActiveWorkflows(): boolean {
    return this.activeWorkflows.size > 0;
  }
}

/**
 * Cycle detection for component rendering
 */
export class ComponentCycleDetector {
  private stack: Set<string> = new Set();
  private path: string[] = [];

  /**
   * Enter a component rendering context
   * @throws CycleDetectedError if component is already being rendered
   */
  enter(componentKey: string): void {
    if (this.stack.has(componentKey)) {
      throw new CycleDetectedError(
        'component',
        [...this.path, componentKey],
        componentKey
      );
    }

    this.stack.add(componentKey);
    this.path.push(componentKey);
  }

  /**
   * Exit a component rendering context
   */
  exit(componentKey: string): void {
    this.stack.delete(componentKey);
    const index = this.path.lastIndexOf(componentKey);
    if (index !== -1) {
      this.path.splice(index);
    }
  }

  /**
   * Get current component depth
   */
  get depth(): number {
    return this.stack.size;
  }
}

/**
 * Global formula cycle detector instance
 */
let globalFormulaDetector: FormulaCycleDetector | undefined;

/**
 * Get or create the global formula cycle detector
 */
export function getFormulaCycleDetector(): FormulaCycleDetector {
  if (!globalFormulaDetector) {
    globalFormulaDetector = new FormulaCycleDetector();
  }
  return globalFormulaDetector;
}

/**
 * Reset the global formula cycle detector (use between renders)
 */
export function resetFormulaCycleDetector(): void {
  globalFormulaDetector = undefined;
}
