import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const proxy = {
    '/api': {
      target: env.VITE_API_PROXY_TARGET || 'http://localhost:3000',
      changeOrigin: true
    }
  }
  return {
    plugins: [vue()],
    server: {
      host: '0.0.0.0',
      port: 5173,
      proxy
    },
    preview: {
      host: '0.0.0.0',
      port: 4173,
      proxy
    }
  }
})
