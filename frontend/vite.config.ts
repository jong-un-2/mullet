import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import wasm from 'vite-plugin-wasm'
import topLevelAwait from 'vite-plugin-top-level-await'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), wasm(), topLevelAwait()],
  define: {
    global: 'globalThis',
    'process.env': {},
    'process.env.NODE_DEBUG': 'false',
    'process.browser': 'true',
  },
  resolve: {
    alias: {
      buffer: 'buffer',
      crypto: 'crypto-browserify',
      util: 'util',
    },
  },
  optimizeDeps: {
    esbuildOptions: {
      target: 'esnext',
    },
    include: [
      'buffer', 
      'process',
      'eventemitter3', 
      'crypto-browserify',
      '@solana/web3.js',
      '@solana/kit',
      '@solana-program/memo',
      '@solana-program/system',
      '@solana-program/token',
      '@solana/wallet-adapter-base',
      '@solana/wallet-adapter-phantom',
      '@solana/wallet-adapter-solflare',
      '@solana/wallet-adapter-backpack'
    ],
    exclude: [
      '@orca-so/whirlpools-core',
      '@orca-so/whirlpools',
      '@kamino-finance/kliquidity-sdk'
    ],
  },
  worker: {
    format: 'es',
  },
  build: {
    target: 'esnext',
    rollupOptions: {
      output: {
        format: 'es',
        manualChunks: {
          vendor: ['react', 'react-dom'],
          solana: ['@solana/web3.js', '@solana/wallet-adapter-react', '@solana/kit'],
          mui: ['@mui/material', '@mui/icons-material', '@mui/lab'],
          utils: ['axios', '@tanstack/react-query']
        }
      }
    },
    chunkSizeWarningLimit: 1000,
    sourcemap: false,
    commonjsOptions: {
      include: [/node_modules/],
      transformMixedEsModules: true,
    },
  },
})
