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

// `npm run dev` has no Vercel runtime, so the invoice-reading function would
// 404 locally. This serves api/extract-invoice.ts from the Vite dev server,
// turning Node's request into the Web Request the function expects. The
// settings it reads go into process.env for this dev process only; nothing
// here reaches the browser, and none of it runs in a production build.
function devApi(env: Record<string, string>): Plugin {
  return {
    name: 'dev-api',
    apply: 'serve',
    configureServer(server) {
      process.env.GEMINI_API_KEY ||= env.GEMINI_API_KEY || env.VITE_GEMINI_API_KEY || '';
      process.env.SUPABASE_URL ||= env.SUPABASE_URL || env.VITE_SUPABASE_URL || '';
      process.env.SUPABASE_ANON_KEY ||= env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY || '';

      server.middlewares.use('/api/extract-invoice', async (req, res) => {
        try {
          const chunks: Buffer[] = [];
          for await (const chunk of req) chunks.push(chunk as Buffer);
          const skip = new Set(['host', 'connection', 'content-length', 'transfer-encoding']);
          const headers = Object.entries(req.headers).flatMap(([k, v]) =>
            skip.has(k) || v == null ? [] : Array.isArray(v) ? v.map((x) => [k, x] as [string, string]) : [[k, v] as [string, string]]);
          const hasBody = req.method !== 'GET' && req.method !== 'HEAD';
          const request = new Request(`http://localhost${req.originalUrl || req.url || ''}`, {
            method: req.method,
            headers,
            body: hasBody ? Buffer.concat(chunks) : undefined,
          });
          const mod = await server.ssrLoadModule('/api/extract-invoice.ts');
          const response: Response = await mod.handle(request);
          res.statusCode = response.status;
          response.headers.forEach((value, key) => res.setHeader(key, value));
          res.end(Buffer.from(await response.arrayBuffer()));
        } catch (e) {
          server.config.logger.error(`dev /api/extract-invoice crashed: ${(e as Error).message}`);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: { reason: 'AI_ERROR' } }));
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');
    // There is deliberately no `define` for the Gemini key any more. This file
    // used to copy GEMINI_API_KEY into the browser bundle as process.env.API_KEY,
    // which published it on chefcode.cc — and the key was stolen and the Google
    // project suspended (2026-10-04). The key is now read only by the server
    // function in api/, and scripts/check-build-secrets.mjs fails the build if
    // a Google key ever appears in dist/ again.
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react(), emitNotFoundPage(), devApi(env)],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
