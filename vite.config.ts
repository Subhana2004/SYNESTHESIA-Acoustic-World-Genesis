import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// Vitest currently resolves its own Vite type copy in CI; the React plugin is
// runtime-compatible, so narrow the config boundary instead of coupling the
// app to Vitest's nested Vite type identity.
export default defineConfig({
  plugins: [react() as never],
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('/node_modules/three/')) return 'three-vendor'
          if (id.includes('/node_modules/react/')) return 'react-vendor'
        },
      },
    },
  },
})
