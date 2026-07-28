import { defineConfig } from 'vite';

export default defineConfig({
  // 相对路径：兼容 GitHub Pages 子路径与 Capacitor 的 file:// 加载
  base: './',
  build: {
    target: 'es2018',
    chunkSizeWarningLimit: 2000,
  },
  server: {
    host: true,
    port: 5173,
  },
});
