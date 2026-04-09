import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const proxyTarget = env.VITE_APP_DEV_PROXY_TARGET || 'http://127.0.0.1:3000'

  return {
    plugins: [vue(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      host: true,
      port: 5173,
      watch: {
        ignored: ['**/_scaffold/**', '**/_references/**', '**/dist/**'],
      },
      proxy: {
        '/dev-api': {
          target: proxyTarget,
          changeOrigin: true,
          rewrite: path => path.replace(/^\/dev-api/, ''),
        },
        '/profile/upload': {
          target: proxyTarget,
          changeOrigin: true,
        },
        '^/v3/api-docs/.*': {
          target: proxyTarget,
          changeOrigin: true,
        },
      },
    },
  }
})