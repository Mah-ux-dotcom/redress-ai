import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  // Forward Apertus calls to the local proxy, which holds the API key.
  server: { proxy: { '/api': `http://127.0.0.1:${process.env.APERTUS_PROXY_PORT ?? 8787}` } },
  preview: { proxy: { '/api': `http://127.0.0.1:${process.env.APERTUS_PROXY_PORT ?? 8787}` } },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
