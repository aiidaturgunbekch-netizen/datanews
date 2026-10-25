import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, type Plugin} from 'vite';

/**
 * В режиме разработки (npm run dev) запускает функции из папки /api так же,
 * как это делает Vercel. Если Redis не подключён, данные хранятся в памяти,
 * а пароль администратора — ADMIN_PASSWORD или «admin-dev».
 */
const localApi = (): Plugin => ({
  name: 'datanews-local-api',
  configureServer(server) {
    if (!process.env.KV_REST_API_URL && !process.env.UPSTASH_REDIS_REST_URL) {
      process.env.DATANEWS_MEMORY_KV = '1';
    }
    // Как rewrite в vercel.json: /n/<id> — страница новости из api/share.ts
    server.middlewares.use((req, _res, next) => {
      const m = (req.url || '').match(/^\/n\/([\w-]+)\/?(?:\?(.*))?$/);
      if (m) req.url = `/api/share?id=${m[1]}${m[2] ? `&${m[2]}` : ''}`;
      next();
    });
    server.middlewares.use('/api', async (req, res, next) => {
      const name = (req.url || '').split('?')[0].replace(/^\/+/, '').replace(/\/$/, '');
      if (!/^[a-z-]+$/.test(name)) return next();
      try {
        const mod = await server.ssrLoadModule(`/api/${name}.ts`);
        const chunks: Buffer[] = [];
        for await (const c of req) chunks.push(c as Buffer);
        const headers = new Headers();
        Object.entries(req.headers).forEach(([k, v]) => v && headers.set(k, Array.isArray(v) ? v.join(', ') : v));
        const request = new Request(`http://${req.headers.host}/api${req.url}`, {
          method: req.method,
          headers,
          body: ['GET', 'HEAD'].includes(req.method || 'GET') ? undefined : Buffer.concat(chunks),
        });
        const response: Response = await mod.default(request);
        res.statusCode = response.status;
        response.headers.forEach((v, k) => res.setHeader(k, v));
        res.end(Buffer.from(await response.arrayBuffer()));
      } catch (e) {
        // Браузер оборвал запрос (перезагрузка страницы) — это не ошибка сервера
        if (req.destroyed || (e as Error)?.message === 'aborted') return;
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'server_error', message: (e as Error)?.message }));
      }
    });
  },
});

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), localApi()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
