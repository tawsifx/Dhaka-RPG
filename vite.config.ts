import { defineConfig } from 'vite';

export default defineConfig({
  root: './',
  base: './',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true,
    target: 'es2022'
  },
  server: {
    port: 3000,
    open: true
  }
});
