import { useEffect, useRef } from 'react';

export function scrubAnimation(element: Element, time: number, duration: number): void {
  const el = element as HTMLElement;
  el.style.animationDelay = `calc(0s - ${time}s)`;
}

export function pauseAllAnimations(): void {
  const style = document.createElement('style');
  style.id = 'pause-animations';
  style.textContent = `[data-id] { animation-play-state: paused !important }`;
  document.head.appendChild(style);
}

export function resumeAnimations(): void {
  const style = document.getElementById('pause-animations');
  style?.remove();
}
