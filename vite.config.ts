import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import { apertusProxy } from './server/apertusProxy';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load all .env entries (not only VITE_*) for server-side use; the Apertus
  // key stays in the Node process and is never bundled into the client.
  const env = { ...loadEnv(mode, process.cwd(), ''), ...process.env };

  return {
    plugins: [react(), apertusProxy(env)],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    optimizeDeps: {
      exclude: ['lucide-react'],
    },
  };
});
