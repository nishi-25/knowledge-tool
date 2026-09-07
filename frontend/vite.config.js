import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// サーバー版はパス付きルート（/admin, /invite/:token など）を nginx の
// try_files フォールバックで配信するため、アセットパスは絶対パス（既定値 '/'）
// である必要がある。デスクトップ版は Electron の app:// プロトコル経由で
// index.html を単独で読み込むため、相対パス（'./'）が必要。
// ビルド時に KV_BUILD_TARGET=desktop を渡すことで切り替える。
export default defineConfig({
  base: process.env.KV_BUILD_TARGET === 'desktop' ? './' : '/',
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/api': {
        target: process.env.VITE_API_PROXY_TARGET || 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
});
