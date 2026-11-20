import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// In development /api is forwarded to the API server, so the browser sees one origin and no CORS is needed.
// Change the target with API_PROXY_TARGET in .env.local (e.g. http://ibram-backend.test for Laravel Herd).
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api': {
          target: env.API_PROXY_TARGET || 'https://ibram.apps.taqat.academy',
          changeOrigin: true,
          secure: true,
        },
      },
    },
  };
});
