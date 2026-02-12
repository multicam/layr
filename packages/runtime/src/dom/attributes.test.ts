import { describe, test, expect, beforeEach } from 'bun:test';
import { Window } from 'happy-dom';
import { setAttribute, setClass, setClasses, setCustomProperty, setStyles } from './attributes';

// Create happy-dom window
const window = new Window();
const document = window.document;

describe('setAttribute', () => {
  let element: HTMLElement;

  beforeEach(() => {
    element = document.createElement('div');
  });

  test('sets string attribute', () => {
    setAttribute(element, 'title', 'Hello');
    expect(element.getAttribute('title')).toBe('Hello');
  });

  test('removes attribute for null', () => {
    element.setAttribute('title', 'Test');
    setAttribute(element, 'title', null);
    expect(element.hasAttribute('title')).toBe(false);
  });

  test('removes attribute for undefined', () => {
    element.setAttribute('title', 'Test');
    setAttribute(element, 'title', undefined);
    expect(element.hasAttribute('title')).toBe(false);
  });

  test('removes attribute for false', () => {
    element.setAttribute('disabled', 'disabled');
    setAttribute(element, 'disabled', false);
    expect(element.hasAttribute('disabled')).toBe(false);
  });

  test('sets empty string for true', () => {
    setAttribute(element, 'disabled', true);
    expect(element.hasAttribute('disabled')).toBe(true);
  });

  test('converts number to string', () => {
    setAttribute(element, 'data-count', 42);
    expect(element.getAttribute('data-count')).toBe('42');
  });
});

describe('setClass', () => {
  let element: HTMLElement;

  beforeEach(() => {
    element = document.createElement('div');
  });

  test('adds class', () => {
    setClass(element, 'active', true);
    expect(element.classList.contains('active')).toBe(true);
  });

  test('removes class', () => {
    element.classList.add('active');
    setClass(element, 'active', false);
    expect(element.classList.contains('active')).toBe(false);
  });
});

describe('setClasses', () => {
  let element: HTMLElement;

  beforeEach(() => {
    element = document.createElement('div');
  });

  test('sets multiple classes', () => {
    setClasses(element, { active: true, hidden: false, visible: true });
    expect(element.classList.contains('active')).toBe(true);
    expect(element.classList.contains('hidden')).toBe(false);
    expect(element.classList.contains('visible')).toBe(true);
  });
});

describe('setCustomProperty', () => {
  let element: HTMLElement;

  beforeEach(() => {
    element = document.createElement('div');
  });

  test('sets CSS custom property', () => {
    setCustomProperty(element, '--color', 'red');
    expect(element.style.getPropertyValue('--color')).toBe('red');
  });
});

describe('setStyles', () => {
  let element: HTMLElement;

  beforeEach(() => {
    element = document.createElement('div');
  });

  test('sets multiple styles', () => {
    setStyles(element as any, {
      color: 'red',
      backgroundColor: 'blue',
    });
    expect(element.style.color).toBe('red');
    expect(element.style.backgroundColor).toBe('blue');
  });
});
