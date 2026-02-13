/**
 * Set an attribute on an element
 */
export function setAttribute(element: Element, name: string, value: unknown): void {
  if (value === null || value === undefined || value === false) {
    element.removeAttribute(name);
    return;
  }
  
  if (value === true) {
    element.setAttribute(name, '');
    return;
  }
  
  element.setAttribute(name, String(value));
}

/**
 * Set class on an element
 */
export function setClass(element: Element, className: string, add: boolean): void {
  if (add) {
    element.classList.add(className);
  } else {
    element.classList.remove(className);
  }
}

/**
 * Set multiple classes
 */
export function setClasses(element: Element, classes: Record<string, boolean>): void {
  for (const [className, add] of Object.entries(classes)) {
    setClass(element, className, add);
  }
}

/**
 * Set CSS custom property
 */
export function setCustomProperty(element: HTMLElement, name: string, value: string): void {
  element.style.setProperty(name, value);
}

/**
 * Set multiple styles
 */
export function setStyles(element: HTMLElement, styles: Record<string, string>): void {
  for (const [name, value] of Object.entries(styles)) {
    element.style[name as any] = value;
  }
}
