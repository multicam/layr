/**
 * Element Definitions Build Script
 * Generates JSON files for all HTML and SVG elements
 * Based on specs/element-definitions.md
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const elementsDir = __dirname;

// ============================================================================
// Types
// ============================================================================

interface ElementDefinition {
  metadata: {
    name: string;
    categories: string[];
    description?: string;
    link?: string;
    aliases?: string[];
    isVoid?: true;
    isPopular?: true;
    permittedChildren?: string[];
    permittedParents?: string[];
    interfaces?: string[];
  };
  element: {
    type: 'nodes';
    source: 'catalog';
    nodes: Record<string, any>;
  };
}

// ============================================================================
// HTML Elements
// ============================================================================

const VOID_ELEMENTS = [
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr'
];

const POPULAR_ELEMENTS = [
  'a', 'button', 'div', 'form', 'h1', 'h2', 'h3', 'img', 'input', 'label', 'li', 'p', 'span', 'ul'
];

const HTML_ELEMENTS: Record<string, Partial<ElementDefinition['metadata']>> = {
  // Layout
  'div': { categories: ['semantic'], description: 'Generic container', aliases: ['container', 'division'] },
  'span': { categories: ['typography'], description: 'Inline container', aliases: ['inline'] },
  'section': { categories: ['semantic'], description: 'Document section' },
  'article': { categories: ['semantic'], description: 'Self-contained content' },
  'header': { categories: ['semantic'], description: 'Header section' },
  'footer': { categories: ['semantic'], description: 'Footer section' },
  'nav': { categories: ['semantic'], description: 'Navigation section' },
  'aside': { categories: ['semantic'], description: 'Sidebar content' },
  'main': { categories: ['semantic'], description: 'Main content area' },
  
  // Typography
  'p': { categories: ['typography'], description: 'Paragraph', aliases: ['paragraph'] },
  'h1': { categories: ['typography'], description: 'Heading level 1', aliases: ['heading', 'title'] },
  'h2': { categories: ['typography'], description: 'Heading level 2' },
  'h3': { categories: ['typography'], description: 'Heading level 3' },
  'h4': { categories: ['typography'], description: 'Heading level 4' },
  'h5': { categories: ['typography'], description: 'Heading level 5' },
  'h6': { categories: ['typography'], description: 'Heading level 6' },
  'blockquote': { categories: ['typography'], description: 'Block quotation' },
  'pre': { categories: ['typography'], description: 'Preformatted text' },
  'code': { categories: ['typography'], description: 'Code fragment' },
  'strong': { categories: ['typography'], description: 'Strong emphasis', aliases: ['bold'] },
  'em': { categories: ['typography'], description: 'Emphasis', aliases: ['italic'] },
  'b': { categories: ['typography'], description: 'Bold text' },
  'i': { categories: ['typography'], description: 'Italic text' },
  'u': { categories: ['typography'], description: 'Underlined text' },
  's': { categories: ['typography'], description: 'Strikethrough text' },
  'mark': { categories: ['typography'], description: 'Highlighted text' },
  'small': { categories: ['typography'], description: 'Small text' },
  'sub': { categories: ['typography'], description: 'Subscript' },
  'sup': { categories: ['typography'], description: 'Superscript' },
  'br': { categories: ['typography'], description: 'Line break' },
  'hr': { categories: ['semantic'], description: 'Horizontal rule' },
  'abbr': { categories: ['typography'], description: 'Abbreviation' },
  'cite': { categories: ['typography'], description: 'Citation' },
  'kbd': { categories: ['typography'], description: 'Keyboard input' },
  'samp': { categories: ['typography'], description: 'Sample output' },
  'var': { categories: ['typography'], description: 'Variable' },
  'time': { categories: ['typography'], description: 'Time element' },
  'address': { categories: ['typography'], description: 'Contact information' },
  
  // Links
  'a': { categories: ['typography'], description: 'Hyperlink', aliases: ['link', 'anchor'] },
  
  // Lists
  'ul': { categories: ['semantic'], description: 'Unordered list', aliases: ['list'] },
  'ol': { categories: ['semantic'], description: 'Ordered list' },
  'li': { categories: ['semantic'], description: 'List item' },
  'dl': { categories: ['semantic'], description: 'Description list', permittedChildren: ['dd', 'dt', 'div', 'script', 'template'] },
  'dt': { categories: ['semantic'], description: 'Description term' },
  'dd': { categories: ['semantic'], description: 'Description details' },
  
  // Media
  'img': { categories: ['media'], description: 'Image', aliases: ['image', 'picture'] },
  'picture': { categories: ['media'], description: 'Picture element' },
  'video': { categories: ['media'], description: 'Video player' },
  'audio': { categories: ['media'], description: 'Audio player' },
  'source': { categories: ['media'], description: 'Media source' },
  'track': { categories: ['media'], description: 'Text track' },
  'canvas': { categories: ['media'], description: 'Canvas element' },
  'iframe': { categories: ['media'], description: 'Inline frame' },
  'embed': { categories: ['media'], description: 'Embedded content' },
  'object': { categories: ['media'], description: 'External resource' },
  'figure': { categories: ['media'], description: 'Figure container' },
  'figcaption': { categories: ['media'], description: 'Figure caption', permittedParents: ['figure'] },
  'map': { categories: ['media'], description: 'Image map' },
  'area': { categories: ['media'], description: 'Image map area' },
  
  // Forms
  'form': { categories: ['form'], description: 'Form container' },
  'input': { categories: ['form'], description: 'Input field', aliases: ['text', 'field'] },
  'button': { categories: ['form'], description: 'Button element' },
  'select': { categories: ['form'], description: 'Dropdown select', permittedChildren: ['option', 'optgroup', 'hr'] },
  'optgroup': { categories: ['form'], description: 'Option group', permittedParents: ['select'], permittedChildren: ['option'] },
  'option': { categories: ['form'], description: 'Select option', permittedParents: ['select', 'datalist', 'optgroup'] },
  'textarea': { categories: ['form'], description: 'Text area' },
  'label': { categories: ['form'], description: 'Form label' },
  'fieldset': { categories: ['form'], description: 'Field set' },
  'legend': { categories: ['form'], description: 'Field legend', permittedParents: ['fieldset'] },
  'datalist': { categories: ['form'], description: 'Data list' },
  'output': { categories: ['form'], description: 'Output element' },
  'progress': { categories: ['form'], description: 'Progress indicator' },
  'meter': { categories: ['form'], description: 'Scalar gauge' },
  'search': { categories: ['form'], description: 'Search input' },
  
  // Tables
  'table': { categories: ['semantic'], description: 'Table', permittedChildren: ['tbody', 'thead', 'tfoot', 'tr', 'colgroup', 'caption'] },
  'thead': { categories: ['semantic'], description: 'Table header', permittedParents: ['table'], permittedChildren: ['tr'] },
  'tbody': { categories: ['semantic'], description: 'Table body', permittedParents: ['table'], permittedChildren: ['tr'] },
  'tfoot': { categories: ['semantic'], description: 'Table footer', permittedParents: ['table'], permittedChildren: ['tr'] },
  'tr': { categories: ['semantic'], description: 'Table row', permittedParents: ['table', 'thead', 'tbody', 'tfoot'], permittedChildren: ['td', 'th', 'script', 'template'] },
  'td': { categories: ['semantic'], description: 'Table cell', permittedParents: ['tr'] },
  'th': { categories: ['semantic'], description: 'Table header cell', permittedParents: ['tr'] },
  'caption': { categories: ['semantic'], description: 'Table caption', permittedParents: ['table'] },
  'colgroup': { categories: ['semantic'], description: 'Column group' },
  'col': { categories: ['semantic'], description: 'Table column' },
  
  // Interactive
  'details': { categories: ['semantic'], description: 'Details element' },
  'summary': { categories: ['semantic'], description: 'Summary element', permittedParents: ['details'] },
  'dialog': { categories: ['semantic'], description: 'Dialog box' },
  'menu': { categories: ['semantic'], description: 'Menu element' },
  
  // Metadata
  'head': { categories: ['semantic'], description: 'Document head' },
  'title': { categories: ['semantic'], description: 'Document title' },
  'meta': { categories: ['semantic'], description: 'Metadata' },
  'link': { categories: ['semantic'], description: 'Link element' },
  'base': { categories: ['semantic'], description: 'Base URL' },
  'style': { categories: ['semantic'], description: 'Style element' },
  'script': { categories: ['semantic'], description: 'Script element' },
  'noscript': { categories: ['semantic'], description: 'No script fallback' },
  'template': { categories: ['semantic'], description: 'Template element' },
  'slot': { categories: ['semantic'], description: 'Shadow DOM slot' },
  
  // Misc
  'html': { categories: ['semantic'], description: 'HTML root' },
  'body': { categories: ['semantic'], description: 'Document body' },
  'data': { categories: ['semantic'], description: 'Data element' },
  'wbr': { categories: ['typography'], description: 'Word break opportunity' },
};

// ============================================================================
// SVG Elements
// ============================================================================

const SVG_ELEMENTS: Record<string, Partial<ElementDefinition['metadata']>> = {
  // Shapes
  'svg': { categories: ['svg', 'semantic'], description: 'SVG root', aliases: ['vector'] },
  'circle': { categories: ['svg'], description: 'Circle shape' },
  'ellipse': { categories: ['svg'], description: 'Ellipse shape' },
  'line': { categories: ['svg'], description: 'Line shape' },
  'path': { categories: ['svg'], description: 'Path shape' },
  'polygon': { categories: ['svg'], description: 'Polygon shape' },
  'polyline': { categories: ['svg'], description: 'Polyline shape' },
  'rect': { categories: ['svg'], description: 'Rectangle shape', aliases: ['rectangle'] },
  
  // Text
  'text': { categories: ['svg'], description: 'Text element' },
  'textPath': { categories: ['svg'], description: 'Text along path' },
  'tspan': { categories: ['svg'], description: 'Text span' },
  
  // Structure
  'g': { categories: ['svg'], description: 'Group element', aliases: ['group'] },
  'defs': { categories: ['svg'], description: 'Definitions' },
  'symbol': { categories: ['svg'], description: 'Symbol definition' },
  'use': { categories: ['svg'], description: 'Use element' },
  'view': { categories: ['svg'], description: 'View element' },
  'foreignObject': { categories: ['svg'], description: 'Foreign object' },
  
  // Gradients
  'linearGradient': { categories: ['svg'], description: 'Linear gradient' },
  'radialGradient': { categories: ['svg'], description: 'Radial gradient' },
  'stop': { categories: ['svg'], description: 'Gradient stop' },
  
  // Filters
  'filter': { categories: ['svg'], description: 'Filter container' },
  'feBlend': { categories: ['svg'], description: 'Blend filter' },
  'feColorMatrix': { categories: ['svg'], description: 'Color matrix filter' },
  'feComponentTransfer': { categories: ['svg'], description: 'Component transfer filter' },
  'feComposite': { categories: ['svg'], description: 'Composite filter' },
  'feConvolveMatrix': { categories: ['svg'], description: 'Convolve matrix filter' },
  'feDiffuseLighting': { categories: ['svg'], description: 'Diffuse lighting filter' },
  'feDisplacementMap': { categories: ['svg'], description: 'Displacement map filter' },
  'feDistantLight': { categories: ['svg'], description: 'Distant light filter' },
  'feDropShadow': { categories: ['svg'], description: 'Drop shadow filter' },
  'feFlood': { categories: ['svg'], description: 'Flood filter' },
  'feFuncA': { categories: ['svg'], description: 'Alpha function' },
  'feFuncB': { categories: ['svg'], description: 'Blue function' },
  'feFuncG': { categories: ['svg'], description: 'Green function' },
  'feFuncR': { categories: ['svg'], description: 'Red function' },
  'feGaussianBlur': { categories: ['svg'], description: 'Gaussian blur filter' },
  'feImage': { categories: ['svg'], description: 'Image filter' },
  'feMerge': { categories: ['svg'], description: 'Merge filter' },
  'feMergeNode': { categories: ['svg'], description: 'Merge node' },
  'feMorphology': { categories: ['svg'], description: 'Morphology filter' },
  'feOffset': { categories: ['svg'], description: 'Offset filter' },
  'fePointLight': { categories: ['svg'], description: 'Point light filter' },
  'feSpecularLighting': { categories: ['svg'], description: 'Specular lighting filter' },
  'feSpotLight': { categories: ['svg'], description: 'Spot light filter' },
  'feTile': { categories: ['svg'], description: 'Tile filter' },
  'feTurbulence': { categories: ['svg'], description: 'Turbulence filter' },
  
  // Clipping/Masking
  'clipPath': { categories: ['svg'], description: 'Clipping path' },
  'mask': { categories: ['svg'], description: 'Mask element' },
  'marker': { categories: ['svg'], description: 'Marker element' },
  'pattern': { categories: ['svg'], description: 'Pattern element' },
  
  // Animation
  'animate': { categories: ['svg'], description: 'Animation element' },
  'animateMotion': { categories: ['svg'], description: 'Motion animation' },
  'animateTransform': { categories: ['svg'], description: 'Transform animation' },
  'set': { categories: ['svg'], description: 'Set animation' },
  
  // Metadata
  'desc': { categories: ['svg'], description: 'Description' },
  'metadata': { categories: ['svg'], description: 'SVG metadata' },
  'title': { categories: ['svg'], description: 'SVG title' },
  
  // Other
  'image': { categories: ['svg'], description: 'SVG image' },
  'mpath': { categories: ['svg'], description: 'Motion path' },
  'script': { categories: ['svg'], description: 'SVG script' },
  'switch': { categories: ['svg'], description: 'Switch element' },
};

// ============================================================================
// Node Templates
// ============================================================================

function createTextNode(tag: string, defaultText?: string): Record<string, any> {
  const text = defaultText || getDefaultText(tag);
  return {
    root: {
      id: 'root',
      type: 'element',
      tag,
      attrs: getDefaultAttrs(tag),
      style: getDefaultStyle(tag),
      events: {},
      classes: {},
      children: ['text'],
    },
    text: {
      id: 'text',
      type: 'text',
      value: { type: 'value', value: text },
    },
  };
}

function createElementNode(tag: string): Record<string, any> {
  return {
    root: {
      id: 'root',
      type: 'element',
      tag,
      attrs: getDefaultAttrs(tag),
      style: getDefaultStyle(tag),
      events: {},
      classes: {},
      children: [],
    },
  };
}

function getDefaultText(tag: string): string {
  const textMap: Record<string, string> = {
    'p': 'Paragraph text',
    'h1': 'Heading 1',
    'h2': 'Heading 2',
    'h3': 'Heading 3',
    'h4': 'Heading 4',
    'h5': 'Heading 5',
    'h6': 'Heading 6',
    'button': 'Button',
    'a': 'Link',
    'label': 'Label',
    'span': 'Text',
    'strong': 'Bold text',
    'em': 'Italic text',
    'b': 'Bold text',
    'i': 'Italic text',
    'code': 'code',
    'blockquote': 'Quote',
    'figcaption': 'Caption',
    'caption': 'Caption',
    'summary': 'Summary',
    'legend': 'Legend',
    'dt': 'Term',
    'dd': 'Description',
    'th': 'Header',
    'td': 'Cell',
    'option': 'Option',
  };
  return textMap[tag] || 'Text';
}

function getDefaultAttrs(tag: string): Record<string, any> {
  const attrMap: Record<string, Record<string, any>> = {
    'a': { href: { type: 'value', value: '/' }, 'data-prerender': { type: 'value', value: 'moderate' } },
    'img': { src: { type: 'value', value: '' }, alt: { type: 'value', value: '' } },
    'input': { type: { type: 'value', value: 'text' }, placeholder: { type: 'value', value: '' } },
    'button': { type: { type: 'value', value: 'button' } },
    'form': { action: { type: 'value', value: '' } },
    'iframe': { src: { type: 'value', value: '' } },
    'video': { src: { type: 'value', value: '' } },
    'textarea': { name: { type: 'value', value: '' } },
    'select': { name: { type: 'value', value: '' } },
    'embed': { src: { type: 'value', value: '' }, type: { type: 'value', value: '' } },
    'source': { src: { type: 'value', value: '' }, type: { type: 'value', value: '' } },
    'track': { src: { type: 'value', value: '' }, kind: { type: 'value', value: 'subtitles' } },
  };
  return attrMap[tag] || {};
}

function getDefaultStyle(tag: string): Record<string, any> {
  const styleMap: Record<string, Record<string, any>> = {
    'span': { display: { type: 'value', value: 'inline' } },
    'strong': { fontWeight: { type: 'value', value: 'bold' } },
    'em': { fontStyle: { type: 'value', value: 'italic' } },
    'code': { fontFamily: { type: 'value', value: 'monospace' } },
  };
  return styleMap[tag] || {};
}

function getInterfaceChain(tag: string, isSvg: boolean = false): string[] {
  if (isSvg) {
    return getSvgInterfaceChain(tag);
  }
  
  const interfaceMap: Record<string, string[]> = {
    'div': ['HTMLDivElement', 'HTMLElement', 'Element', 'Node', 'EventTarget', 'global'],
    'span': ['HTMLSpanElement', 'HTMLElement', 'Element', 'Node', 'EventTarget', 'global'],
    'p': ['HTMLParagraphElement', 'HTMLElement', 'Element', 'Node', 'EventTarget', 'global'],
    'a': ['HTMLAnchorElement', 'HTMLElement', 'Element', 'Node', 'EventTarget', 'global'],
    'img': ['HTMLImageElement', 'HTMLElement', 'Element', 'Node', 'EventTarget', 'global'],
    'input': ['HTMLInputElement', 'HTMLElement', 'Element', 'Node', 'EventTarget', 'global'],
    'button': ['HTMLButtonElement', 'HTMLElement', 'Element', 'Node', 'EventTarget', 'global'],
    'form': ['HTMLFormElement', 'HTMLElement', 'Element', 'Node', 'EventTarget', 'global'],
    'select': ['HTMLSelectElement', 'HTMLElement', 'Element', 'Node', 'EventTarget', 'global'],
    'textarea': ['HTMLTextAreaElement', 'HTMLElement', 'Element', 'Node', 'EventTarget', 'global'],
    'table': ['HTMLTableElement', 'HTMLElement', 'Element', 'Node', 'EventTarget', 'global'],
    'video': ['HTMLVideoElement', 'HTMLMediaElement', 'HTMLElement', 'Element', 'Node', 'EventTarget', 'global'],
    'audio': ['HTMLAudioElement', 'HTMLMediaElement', 'HTMLElement', 'Element', 'Node', 'EventTarget', 'global'],
    'canvas': ['HTMLCanvasElement', 'HTMLElement', 'Element', 'Node', 'EventTarget', 'global'],
    'iframe': ['HTMLIFrameElement', 'HTMLElement', 'Element', 'Node', 'EventTarget', 'global'],
  };
  
  return interfaceMap[tag] || ['HTMLElement', 'Element', 'Node', 'EventTarget', 'global'];
}

function getSvgInterfaceChain(tag: string): string[] {
  const interfaceMap: Record<string, string[]> = {
    'svg': ['SVGSVGElement', 'SVGElement', 'Element', 'Node', 'EventTarget', 'global'],
    'circle': ['SVGCircleElement', 'SVGGeometryElement', 'SVGGraphicsElement', 'SVGElement', 'Element', 'Node', 'EventTarget', 'global'],
    'rect': ['SVGRectElement', 'SVGGeometryElement', 'SVGGraphicsElement', 'SVGElement', 'Element', 'Node', 'EventTarget', 'global'],
    'path': ['SVGPathElement', 'SVGGeometryElement', 'SVGGraphicsElement', 'SVGElement', 'Element', 'Node', 'EventTarget', 'global'],
    'line': ['SVGLineElement', 'SVGGeometryElement', 'SVGGraphicsElement', 'SVGElement', 'Element', 'Node', 'EventTarget', 'global'],
    'text': ['SVGTextElement', 'SVGTextPositioningElement', 'SVGTextContentElement', 'SVGGraphicsElement', 'SVGElement', 'Element', 'Node', 'EventTarget', 'global'],
  };
  
  return interfaceMap[tag] || ['SVGElement', 'Element', 'Node', 'EventTarget', 'global'];
}

// ============================================================================
// Build Functions
// ============================================================================

function buildHtmlElement(name: string, meta: Partial<ElementDefinition['metadata']>): ElementDefinition {
  const isVoid = VOID_ELEMENTS.includes(name);
  const isPopular = POPULAR_ELEMENTS.includes(name);
  
  const nodes = isVoid ? createElementNode(name) : createTextNode(name);
  
  return {
    metadata: {
      name,
      categories: meta.categories || ['semantic'],
      description: meta.description,
      link: `https://developer.mozilla.org/en-US/docs/Web/HTML/Element/${name}`,
      aliases: meta.aliases,
      ...(isVoid ? { isVoid: true as const } : {}),
      ...(isPopular ? { isPopular: true as const } : {}),
      permittedChildren: meta.permittedChildren,
      permittedParents: meta.permittedParents,
      interfaces: getInterfaceChain(name),
    },
    element: {
      type: 'nodes',
      source: 'catalog',
      nodes,
    },
  };
}

function buildSvgElement(name: string, meta: Partial<ElementDefinition['metadata']>): ElementDefinition {
  const isPopular = ['line', 'path', 'rect', 'svg'].includes(name);
  const isVoid = ['stop', 'feFuncA', 'feFuncB', 'feFuncG', 'feFuncR'].includes(name);
  
  const nodes = isVoid ? createElementNode(name) : createElementNode(name);
  
  return {
    metadata: {
      name,
      categories: meta.categories || ['svg'],
      description: meta.description,
      link: `https://developer.mozilla.org/en-US/docs/Web/SVG/Element/${name}`,
      aliases: meta.aliases,
      ...(isVoid ? { isVoid: true as const } : {}),
      ...(isPopular ? { isPopular: true as const } : {}),
      permittedChildren: meta.permittedChildren,
      permittedParents: meta.permittedParents,
      interfaces: getInterfaceChain(name, true),
    },
    element: {
      type: 'nodes',
      source: 'catalog',
      nodes,
    },
  };
}

function buildInterfacesJson(): Record<string, any> {
  const interfaces: Record<string, any> = {};
  
  // Common HTML interfaces
  const htmlInterfaces = [
    'HTMLElement', 'HTMLDivElement', 'HTMLSpanElement', 'HTMLParagraphElement',
    'HTMLAnchorElement', 'HTMLImageElement', 'HTMLInputElement', 'HTMLButtonElement',
    'HTMLFormElement', 'HTMLSelectElement', 'HTMLTextAreaElement', 'HTMLTableElement',
    'HTMLVideoElement', 'HTMLAudioElement', 'HTMLCanvasElement', 'HTMLIFrameElement',
    'Element', 'Node', 'EventTarget'
  ];
  
  for (const iface of htmlInterfaces) {
    interfaces[iface] = {
      attributes: {},
      events: {
        'click': { description: 'Fired on mouse click' },
        'dblclick': { description: 'Fired on double click' },
        'mousedown': { description: 'Fired when mouse button is pressed' },
        'mouseup': { description: 'Fired when mouse button is released' },
        'mousemove': { description: 'Fired when mouse is moved' },
        'mouseover': { description: 'Fired when mouse enters element' },
        'mouseout': { description: 'Fired when mouse leaves element' },
        'focus': { description: 'Fired when element receives focus' },
        'blur': { description: 'Fired when element loses focus' },
        'keydown': { description: 'Fired when key is pressed' },
        'keyup': { description: 'Fired when key is released' },
        'change': { description: 'Fired when value changes' },
        'input': { description: 'Fired on input' },
        'submit': { description: 'Fired on form submit' },
      }
    };
  }
  
  // Add specific attributes
  interfaces['HTMLInputElement'] = {
    ...interfaces['HTMLInputElement'],
    attributes: {
      'type': { description: 'Input type', values: ['text', 'password', 'email', 'number', 'tel', 'url', 'search', 'date', 'datetime-local', 'time', 'week', 'month', 'color', 'file', 'checkbox', 'radio', 'range', 'hidden', 'submit', 'reset', 'button', 'image'] },
      'value': { description: 'Current value' },
      'placeholder': { description: 'Placeholder text' },
      'disabled': { description: 'Disable the input' },
      'required': { description: 'Mark as required' },
      'readonly': { description: 'Make read-only' },
      'min': { description: 'Minimum value' },
      'max': { description: 'Maximum value' },
      'step': { description: 'Step value' },
      'pattern': { description: 'Validation pattern' },
    }
  };
  
  interfaces['HTMLAnchorElement'] = {
    ...interfaces['HTMLAnchorElement'],
    attributes: {
      'href': { description: 'Link URL' },
      'target': { description: 'Target frame', values: ['_self', '_blank', '_parent', '_top'] },
      'rel': { description: 'Relationship' },
      'download': { description: 'Download filename' },
    }
  };
  
  return interfaces;
}

// ============================================================================
// Main
// ============================================================================

function main() {
  console.log('Building element definitions...');
  
  // Create directories
  const htmlDir = join(elementsDir, 'html');
  const svgDir = join(elementsDir, 'svg');
  const interfacesDir = join(elementsDir, 'interfaces');
  
  mkdirSync(htmlDir, { recursive: true });
  mkdirSync(svgDir, { recursive: true });
  mkdirSync(interfacesDir, { recursive: true });
  
  // Build HTML elements
  console.log(`Building ${Object.keys(HTML_ELEMENTS).length} HTML elements...`);
  for (const [name, meta] of Object.entries(HTML_ELEMENTS)) {
    const element = buildHtmlElement(name, meta);
    const filePath = join(htmlDir, `${name}.json`);
    writeFileSync(filePath, JSON.stringify(element, null, 2));
  }
  
  // Build SVG elements
  console.log(`Building ${Object.keys(SVG_ELEMENTS).length} SVG elements...`);
  for (const [name, meta] of Object.entries(SVG_ELEMENTS)) {
    const element = buildSvgElement(name, meta);
    const filePath = join(svgDir, `${name}.json`);
    writeFileSync(filePath, JSON.stringify(element, null, 2));
  }
  
  // Build interfaces
  console.log('Building interfaces...');
  const interfaces = buildInterfacesJson();
  writeFileSync(join(interfacesDir, 'interfaces.json'), JSON.stringify(interfaces, null, 2));
  
  console.log('Done!');
  console.log(`  HTML elements: ${Object.keys(HTML_ELEMENTS).length}`);
  console.log(`  SVG elements: ${Object.keys(SVG_ELEMENTS).length}`);
}

main();
