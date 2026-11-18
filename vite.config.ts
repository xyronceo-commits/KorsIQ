import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(() => {
    // Never inject secrets (e.g. GEMINI_API_KEY) here: anything in `define` is published inside the browser bundle.
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        rollupOptions: {
          output: {
            manualChunks: {
              'vendor-react': ['react', 'react-dom'],
              'vendor-supabase': ['@supabase/supabase-js'],
              'vendor-exports': ['jspdf', 'pptxgenjs', 'jszip'],
              'vendor-charts': ['recharts'],
              'vendor-motion': ['motion'],
              'vendor-markdown': ['react-markdown'],
            },
          },
        },
      },
    };
});
