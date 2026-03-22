import { defineConfig } from 'electron-vite'
import { resolve } from 'path'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  main: {
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'electron/main/index.ts')
        }
      }
    }
  },
  preload: {
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'electron/preload/index.ts')
        }
      }
    }
  },
  renderer: {
    root: resolve(__dirname, 'client'),
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@app': resolve(__dirname, 'client/src/app'),
        '@features': resolve(__dirname, 'client/src/features'),
        '@shared': resolve(__dirname, 'client/src/shared'),
      }
    },
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'client/index.html')
        }
      }
    }
  }
})