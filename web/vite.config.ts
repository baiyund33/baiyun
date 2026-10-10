import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api/social': {
        target: 'http://127.0.0.1:8889',
        changeOrigin: true,
      },
      '/api/user': {
        target: 'http://127.0.0.1:8888',
        changeOrigin: true,
      },
    },
  },
});
