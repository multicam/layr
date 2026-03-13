import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { config } from '../../config';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    port: config.ports.editor,
    watch: {
      usePolling: true,
      interval: 1000,
    },
    proxy: {
      '/api': `http://localhost:${config.ports.backend}`,
      '/health': `http://localhost:${config.ports.backend}`,
    },
  },
});
