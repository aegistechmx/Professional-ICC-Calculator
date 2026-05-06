import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const isAnalyze = mode === 'analyze';

  return {
    plugins: [
      react(),
      ...(isAnalyze ? [
        {
          name: 'bundle-analyzer',
          generateBundle() { }
        }
      ] : [])
    ],

    optimizeDeps: {
      include: ['react', 'react-dom', 'reactflow']
    },

    build: {
      sourcemap: true,
      rollupOptions: {
        output: {
          manualChunks: {
            flow: ['reactflow']
          }
        }
      }
    },

    publicDir: 'public',

    server: {
      port: 5173,
      strictPort: true,
      proxy: {
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/api/, '')
        },
        '/icc': {
          target: 'http://localhost:3001',
          changeOrigin: true,
          secure: false
        }
      }
    },

    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.js'],
      css: true,
      coverage: {
        reporter: ['text', 'html']
      }
    }
  };
});