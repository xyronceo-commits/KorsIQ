import path from 'path';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

const DEFAULT_GSC_VERIFICATION = 'MoRzQwun2wEGYjmr6Wea_xrh5MXkJ88I1YUyIqvJ92Y';

function injectSeoVerificationPlugin(verificationToken: string): Plugin {
  const safeToken = verificationToken.replace(/["<>]/g, '').trim();
  const metaTag = safeToken
    ? `<meta name="google-site-verification" content="${safeToken}" />`
    : '';
  return {
    name: 'korsiq-seo-verification',
    transformIndexHtml(html) {
      return html.replace('<!-- GOOGLE_SITE_VERIFICATION_META -->', metaTag);
    },
  };
}

export default defineConfig(({ mode }) => {
    // Never inject secrets (e.g. GEMINI_API_KEY) here: anything in `define` is published inside the browser bundle.
    const env = loadEnv(mode, process.cwd(), 'VITE_');
    const gscToken = (env.VITE_GOOGLE_SITE_VERIFICATION ?? process.env.VITE_GOOGLE_SITE_VERIFICATION ?? DEFAULT_GSC_VERIFICATION).trim();

    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react(), injectSeoVerificationPlugin(gscToken)],
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
