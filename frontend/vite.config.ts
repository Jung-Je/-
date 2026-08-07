import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // PRODUCT.md / 백엔드 .envs 의 FRONTEND_URL=http://localhost:3000 기본값과 맞춤
    port: 3000,
    strictPort: true,
  },
  preview: {
    port: 3000,
    strictPort: true,
  },
})
