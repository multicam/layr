/**
 * Project Data Model Types
 * Based on specs/project-data-model.md
 */

import type { Component } from './component';
import type { Theme, ProjectThemeConfig } from './theme';
import type { CustomRoute } from './route';
import type { Formula } from './formula';
import type { ActionModel } from './action';

// ============================================================================
// Project (Top-Level Envelope)
// ============================================================================

/**
 * Top-level project envelope - the complete JSON structure
 */
export interface Project {
  id?: string; // UUID
  project: ToddleProject;
  commit: string; // SHA hash
  files: ProjectFiles;
}

/**
 * Project metadata (ToddleProject)
 */
export interface ToddleProject {
  id: string; // UUID
  name: string;
  short_id: string; // URL-safe slug
  type: 'app' | 'package';
  description?: string;
  emoji?: string | null;
  thumbnail?: { path: string } | null;
}

/**
 * Project files container - all functional assets
 */
export interface ProjectFiles {
  components: Partial<Record<string, Component>>;
  packages?: Partial<Record<string, InstalledPackage>>;
  actions?: Record<string, PluginAction>;
  formulas?: Record<string, PluginFormula>;
  routes?: Record<string, CustomRoute>;
  config?: ProjectConfig;
  themes?: Record<string, Theme>;
  services?: Record<string, ApiService>;
}

// ============================================================================
// Installed Package
// ============================================================================

export interface InstalledPackage {
  manifest: PackageManifest;
  components: Partial<Record<string, Component>>;
  actions?: Record<string, PluginAction>;
  formulas?: Record<string, PluginFormula>;
}

export interface PackageManifest {
  name: string;
  commit: string; // SHA hash
}

// ============================================================================
// Plugin Action
// ============================================================================

export interface PluginAction {
  name: string;
  // Additional fields based on action system spec
  action: ActionModel;
}

// ============================================================================
// Plugin Formula
// ============================================================================

export interface PluginFormula {
  name: string;
  // Additional fields based on formula system spec
  formula: Formula;
}

// ============================================================================
// Project Config
// ============================================================================

export interface ProjectConfig {
  runtimeVersion?: string;
  meta?: ProjectMeta;
  theme?: ProjectThemeConfig;
}

export interface ProjectMeta {
  icon?: { formula: Formula } | null;
  robots?: { formula: Formula } | null;
  sitemap?: { formula: Formula } | null;
  manifest?: { formula: Formula } | null;
  serviceWorker?: { formula: Formula } | null;
}

// ============================================================================
// API Service
// ============================================================================

export interface ApiService {
  name: string;
  type: 'supabase' | 'xano' | 'custom';
  baseUrl?: Formula;
  docsUrl?: Formula;
  apiKey?: Formula;
  meta?: Record<string, unknown>;
}
