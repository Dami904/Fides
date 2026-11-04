import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  // pnpm web:live sets FIDES_API_PORT and proxies /api to the live demo server.
  server: { host: '127.0.0.1', port: 4500, ...(process.env.FIDES_API_PORT ? { proxy: { '/api': `http://127.0.0.1:${process.env.FIDES_API_PORT}` } } : {}) },
  preview: { host: '127.0.0.1', port: 4500 },
});
