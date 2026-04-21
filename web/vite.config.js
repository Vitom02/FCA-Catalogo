import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// - Desarrollo: base /
// - Producción: si existe VITE_BASE en .env.*, se usa (Docker: /). Si no, GitHub Pages /FCA-Catalogo/
function normalizeBase(v) {
  if (v == null || v === '' || v === '/') return '/'
  const withSlash = v.startsWith('/') ? v : `/${v}`
  return withSlash.endsWith('/') ? withSlash : `${withSlash}/`
}

function resolveProductionBase(env) {
  if (Object.prototype.hasOwnProperty.call(env, 'VITE_BASE')) {
    return normalizeBase(env.VITE_BASE)
  }
  return '/FCA-Catalogo/'
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const base = mode !== 'production' ? '/' : resolveProductionBase(env)
  return {
    base,
    plugins: [react()],
  }
})
