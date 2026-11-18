import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Vite serves HTML without a charset by default. Keep the UTF-8 contract explicit
// for text responses in development and preview, without touching binary assets.
function utf8Responses(req, res, next) {
  const setHeader = res.setHeader;
  res.setHeader = function (name, value) {
    if (name.toLowerCase() === 'content-type' && typeof value === 'string'
      && /^(text\/|application\/(javascript|json))/.test(value) && !/charset=/i.test(value)) {
      value += '; charset=utf-8';
    }
    return setHeader.call(this, name, value);
  };
  next();
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), {
    name: 'utf8-text-responses',
    configureServer(server) { server.middlewares.use(utf8Responses); },
    configurePreviewServer(server) { server.middlewares.use(utf8Responses); },
  }],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
});
