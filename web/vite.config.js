import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// Producción (GitHub Pages): https://vitom02.github.io/FCA-Catalogo/
export default defineConfig(({ mode }) => ({
  base: mode === 'production' ? '/FCA-Catalogo/' : '/',
  plugins: [react()],
}))
