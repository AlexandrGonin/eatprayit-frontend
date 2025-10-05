import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    port: 3000,
    host: true
  },
  build: {
    outDir: 'dist',
    target: 'es2020'
  },
  // Явно указываем корневую папку
  root: '.',
  publicDir: 'public'
})