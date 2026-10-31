import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    // Split large third-party libraries into cacheable vendor chunks (Section 15).
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-leaflet': ['leaflet', 'react-leaflet'],
          'vendor-recharts': ['recharts'],
          'vendor-icons': ['lucide-react'],
          'vendor-three': ['three'],
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'http://localhost:7860',
        changeOrigin: true,
      },
    },
  },
});
