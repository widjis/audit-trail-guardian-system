import { defineConfig, mergeConfig } from 'vite';
import appConfig from '../../vite.config';

// Keep every API request, including legacy relative fetch('/api/...'), on the fixture.
// The normal application Vite configuration and production API behavior are unchanged.
export default defineConfig((env) =>
  mergeConfig(appConfig({ ...env, mode: 'ui-fixture' }), {
    define: { 'import.meta.env.VITE_API_URL': JSON.stringify('/api') },
    server: {
      host: '127.0.0.1',
      port: 18876,
      strictPort: true,
      proxy: {
        '/api': { target: 'http://127.0.0.1:18877', changeOrigin: true },
      },
    },
  }),
);
