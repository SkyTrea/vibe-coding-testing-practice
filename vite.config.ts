import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  server: {
    host: '127.0.0.1',
  },
  // 只在 production 使用 base path（GitHub Pages 部署）
  base: process.env.NODE_ENV === 'production' ? '/vibe-coding-testing-practice/' : '/',
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    reporters: ['default', 'html'],
    outputFile: {
      html: './html-report/index.html',
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      reportsDirectory: './coverage',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/test/**', 'src/mocks/**', 'src/main.tsx', 'src/vite-env.d.ts'],
    },
  },
})
