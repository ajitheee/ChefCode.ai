import path from 'path';
import fs from 'fs';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

// Vercel serves dist/404.html, with a real HTTP 404 status, for any path that
// matches neither a static file nor a rewrite in vercel.json. Making that file
// a copy of the built index.html means the 404 page is the full app — navbar,
// brand, the router's NotFound view — rather than a bare static page. It has to
// be copied after the build, because index.html references hashed asset names
// that only exist once Vite has finished.
function emitNotFoundPage(): Plugin {
  return {
    name: 'emit-404',
    apply: 'build',
    closeBundle() {
      const out = path.resolve(__dirname, 'dist');
      const index = path.join(out, 'index.html');
      if (fs.existsSync(index)) fs.copyFileSync(index, path.join(out, '404.html'));
    },
  };
}

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');
    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY || env.GEMINI_API_KEY || env.API_KEY || '';
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react(), emitNotFoundPage()],
      define: {
        'process.env.API_KEY': JSON.stringify(apiKey),
        'process.env.GEMINI_API_KEY': JSON.stringify(apiKey)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
