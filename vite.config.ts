import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react-swc';
import tailwindcss from '@tailwindcss/vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd());
  const SECRET_URL_PARAM = env.VITE_SECRET_URL_PARAM;

  const isProdBuild = command === 'build' && mode === 'production';

  return {
    plugins: [
      react(),
      tailwindcss(),
      nodePolyfills(),
      isProdBuild && {
        name: 'append-secret-key-to-local-assets',
        transformIndexHtml(html) {
          return html.replace(
            // Match src/href attributes, skip external URLs
            /(src|href)=["'](?!https?:\/\/|\/\/)([^"']+)["']/g,
            (match, attr, url) => {
              // Match only local URLs
              if (
                !url.startsWith('/') &&
                !url.startsWith('./') &&
                !url.startsWith('../')
              ) {
                return match;
              }

              try {
                // Use browser URL parser with dummy origin for relative paths
                const parsed = new URL(url, 'http://dummy.local');
                parsed.search += (parsed.search ? '&' : '?') + SECRET_URL_PARAM;

                const newUrl = parsed.pathname + parsed.search + parsed.hash;
                return `${attr}="${newUrl}"`;
              } catch {
                return match;
              }
            },
          );
        },
      },
    ],
  };
});
