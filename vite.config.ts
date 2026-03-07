import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      devOptions: {
        enabled: true
      },
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg', '/images/fullbase_logo.png'],
      manifest: {
        name: 'fullbase',
        short_name: 'fullbase',
        description: 'CRM para otimizar vendas no mercado digital',
        theme_color: '#111827',
        background_color: '#111827',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: '/images/fullbase_logo.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/images/fullbase_logo.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: '/images/fullbase_logo.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
