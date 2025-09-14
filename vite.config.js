import { defineConfig, loadEnv } from 'vite';

// Expose BLENDER_* variables to `import.meta.env` and retain default VITE_ prefix
export default defineConfig(({ mode }) => {
  // Load all env (no prefix filtering) so local `.env` files can be used too
  loadEnv(mode, process.cwd(), '');
  return {
    envPrefix: ['VITE_', 'BLENDER_'],
    server: {
      cors: true,
      proxy: {
        // Dev proxy to MCP server to avoid CORS and unify base URL
        '/mcp': {
          target: `http://${process.env.BLENDER_HOST || '127.0.0.1'}:${
            process.env.BLENDER_PORT || 9876
          }`,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/mcp/, ''),
        },
      },
    },
    plugins: [
      {
        name: 'mcp-health-middleware',
        apply: 'serve',
        configureServer(server) {
          // Provide a simple dev health endpoint. If your real MCP also has /health,
          // this middleware will respond before the proxy.
          server.middlewares.use('/mcp/health', (req, res, _next) => {
            res.statusCode = 200;
            res.setHeader('Content-Type', 'text/plain');
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.end('ok');
          });
        },
      },
    ],
  };
});
