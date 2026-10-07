import { defineConfig } from 'vite';

export default defineConfig({
  server: { watch: { ignored: ['**/.playtest/**'] } },
  // Phaser is intentionally a single bundled engine in this small prototype.
  build: { chunkSizeWarningLimit: 1600 },
});
