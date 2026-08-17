import { resolve } from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// Served from https://<user>.github.io/edu/ — every URL below is base-aware.
const BASE = "/edu/";

export default defineConfig({
  base: BASE,
  build: {
    target: "es2020",
    rollupOptions: {
      input: {
        home: resolve(import.meta.dirname, "index.html"),
        compass: resolve(import.meta.dirname, "compass/index.html"),
        atlas: resolve(import.meta.dirname, "atlas/index.html"),
      },
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "script-defer",
      includeAssets: ["favicon.svg", "icons/apple-touch-icon.png"],
      manifest: {
        id: BASE,
        name: "Amber Sea — maths and the world, for kids",
        short_name: "Amber Sea",
        description:
          "Two offline learning voyages for children: olympiad-style maths puzzles and a flags, capitals and country-outline drill. English and Spanish.",
        start_url: BASE,
        scope: BASE,
        display: "standalone",
        orientation: "any",
        background_color: "#061626",
        theme_color: "#061626",
        lang: "en",
        dir: "ltr",
        categories: ["education", "games", "kids"],
        icons: [
          { src: `${BASE}icons/icon-192.png`, sizes: "192x192", type: "image/png" },
          { src: `${BASE}icons/icon-512.png`, sizes: "512x512", type: "image/png" },
          {
            src: `${BASE}icons/maskable-512.png`,
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
        // Shown in Chrome's richer install dialog.
        screenshots: [
          {
            src: `${BASE}screenshots/compass-narrow.png`,
            sizes: "540x1080",
            type: "image/png",
            form_factor: "narrow",
            label: "A puzzle stop in The Golden Compass",
          },
          {
            src: `${BASE}screenshots/atlas-wide.png`,
            sizes: "1280x800",
            type: "image/png",
            form_factor: "wide",
            label: "Identifying a country outline in Atlas Drill",
          },
        ],
        shortcuts: [
          {
            name: "The Golden Compass",
            short_name: "Compass",
            description: "Maths voyage in fifteen stops",
            url: `${BASE}compass/`,
            icons: [{ src: `${BASE}icons/icon-192.png`, sizes: "192x192" }],
          },
          {
            name: "Atlas Drill",
            short_name: "Atlas",
            description: "Flags, capitals and outlines",
            url: `${BASE}atlas/`,
            icons: [{ src: `${BASE}icons/icon-192.png`, sizes: "192x192" }],
          },
        ],
      },
      workbox: {
        // Multi-page app: every page is precached at its own URL, so no
        // single-document navigate fallback.
        navigateFallback: null,
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        // The 50m world atlas is ~740 kB and must be available offline.
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        globPatterns: ["**/*.{js,css,html,woff2,json,png,svg,ico,webmanifest}"],
      },
      devOptions: { enabled: false },
    }),
  ],
});
