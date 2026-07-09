import { readdirSync } from 'fs'
import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { viteStaticCopy } from 'vite-plugin-static-copy'

const excalidrawFontsDir = resolve('node_modules/@excalidraw/excalidraw/dist/prod/fonts')

// Excalidraw fetches its fonts from esm.sh's CDN by default. This app is
// local-first with no cloud dependency, so serve its bundled font files
// ourselves instead (paired with window.EXCALIDRAW_ASSET_PATH). One target
// per font family keeps each glob to a single directory level; vite-plugin-
// static-copy preserves full absolute path structure by default, so
// stripBase flattens each match back down to just its filename.
const excalidrawFontTargets = readdirSync(excalidrawFontsDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => ({
    src: `${resolve('node_modules/@excalidraw/excalidraw/dist/prod/fonts', entry.name)}/*`,
    dest: `excalidraw-assets/fonts/${entry.name}`,
    rename: { stripBase: true as const }
  }))

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()]
  },
  preload: {
    // A sandboxed preload script can't `require()` arbitrary npm packages at
    // runtime, so @electron-toolkit/preload must be bundled in rather than
    // externalized like the rest of node_modules.
    plugins: [externalizeDepsPlugin({ exclude: ['@electron-toolkit/preload'] })]
  },
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src'),
        '@': resolve('src/renderer/src')
      }
    },
    plugins: [react(), tailwindcss(), viteStaticCopy({ targets: excalidrawFontTargets })]
  }
})
