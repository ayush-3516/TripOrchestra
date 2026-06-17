import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// Backend port — keep in sync with backend/.env PORT.
const BACKEND_PORT = process.env.BACKEND_PORT ?? '5000';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, '../shared/src'),
    },
  },
  server: {
    port: 5173,
    // Proxy API calls to the backend so the browser talks same-origin in dev
    // (no CORS) and the SSE stream is forwarded untouched.
    proxy: {
      '/api': {
        target: `http://localhost:${BACKEND_PORT}`,
        changeOrigin: true,
      },
    },
  },
});
