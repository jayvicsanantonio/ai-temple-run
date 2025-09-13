import { defineConfig, loadEnv } from 'vite';

// Expose BLENDER_* variables to `import.meta.env` and retain default VITE_ prefix
export default defineConfig(({ mode }) => {
  // Load all env (no prefix filtering) so local `.env` files can be used too
  loadEnv(mode, process.cwd(), '');
  return {
    envPrefix: ['VITE_', 'BLENDER_'],
  };
});

