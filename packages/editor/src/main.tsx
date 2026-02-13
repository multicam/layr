import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles.css';

// Initialize with demo project for testing
import { useProjectStore } from './stores';

const demoProject = {
  project: {
    id: 'demo',
    name: 'Demo',
    type: 'app',
    short_id: 'demo',
  },
  commit: 'initial',
  files: {
    components: {
      home: {
        name: 'home',
        route: { path: '/' },
        nodes: {
          root: {
            id: 'root',
            type: 'element',
            tag: 'div',
            attrs: {
              class: { type: 'value', value: 'container' },
            },
            children: ['title', 'content'],
          },
          title: {
            id: 'title',
            type: 'element',
            tag: 'h1',
            children: ['titleText'],
          },
          titleText: {
            id: 'titleText',
            type: 'text',
            value: { type: 'value', value: 'Welcome to Layr' },
          },
          content: {
            id: 'content',
            type: 'element',
            tag: 'p',
            children: ['contentText'],
          },
          contentText: {
            id: 'contentText',
            type: 'text',
            value: { type: 'value', value: 'Build visual applications with ease.' },
          },
        },
      },
    },
  },
};

// Set project on load
useProjectStore.getState().setProject(demoProject);

const container = document.getElementById('root');
if (container) {
  createRoot(container).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
}
