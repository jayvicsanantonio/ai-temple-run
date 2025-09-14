import { defineConfig } from 'vite';

// Minimal Vite config
export default defineConfig(() => ({
  envPrefix: ['VITE_'],
  server: { cors: true },
}));
