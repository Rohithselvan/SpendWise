/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'node:path';

/**
 * Asset paths are relative ("./") by default, so one build works from any folder:
 * a domain root, a GitHub Pages project URL (/<repo>/), or a sub-folder on any static host.
 * Routing uses URL hashes (#/reports), so no server rewrites are needed.
 * BASE_PATH can still override this (e.g. BASE_PATH=/spendwise/) if a host ever requires absolute paths.
 */
const base = process.env.BASE_PATH ?? './';

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['icons/apple-touch-icon.png', 'icons/favicon.svg', 'icons/favicon-32.png'],
      manifest: {
        name: 'SpendWise',
        short_name: 'SpendWise',
        description: 'Private, offline personal expense tracker. Your data never leaves your device.',
        lang: 'en-IN',
        dir: 'ltr',
        start_url: './',
        scope: './',
        id: './',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#0f1211',
        background_color: '#0f1211',
        categories: ['finance', 'productivity'],
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Only application assets are precached. No runtime caching of any data requests.
        globPatterns: ['**/*.{js,css,html,svg,png,woff2,webmanifest}'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
        clientsClaim: false,
        skipWaiting: false,
        runtimeCaching: [],
      },
      devOptions: { enabled: false },
    }),
  ],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  build: {
    target: 'es2020',
    sourcemap: false,
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks: {
          charts: ['recharts'],
          vendor: ['react', 'react-dom', 'react-router-dom', 'dexie', 'dexie-react-hooks', 'date-fns', 'zod'],
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: false,
    css: false,
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
