import fs from 'node:fs'
import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// One id per build. On Vercel it is the git commit, so it changes with every deploy.
const BUILD_ID = (process.env.VERCEL_GIT_COMMIT_SHA || Date.now().toString(36)).slice(0, 12)

// Writes dist/version.json and stamps the same id into dist/sw.js (so sw.js differs on every deploy).
function nibraasBuildStamp() {
  let outDir = 'dist'
  return {
    name: 'nibraas-build-stamp',
    apply: 'build',
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir)
    },
    closeBundle() {
      fs.writeFileSync(
        path.join(outDir, 'version.json'),
        JSON.stringify({ id: BUILD_ID, builtAt: new Date().toISOString() })
      )
      const swPath = path.join(outDir, 'sw.js')
      if (fs.existsSync(swPath)) {
        const sw = fs.readFileSync(swPath, 'utf8')
        if (!sw.includes('__BUILD_ID__')) throw new Error('sw.js has no __BUILD_ID__ placeholder')
        fs.writeFileSync(swPath, sw.replace(/__BUILD_ID__/g, BUILD_ID))
      }
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  define: { __BUILD_ID__: JSON.stringify(BUILD_ID) },
  plugins: [react(), tailwindcss(), nibraasBuildStamp()],
})
