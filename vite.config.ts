import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  /*
   * Where the build will be served from.
   *
   * Default '/' suits a domain root, which is how InfinityFree serves the
   * contents of `htdocs/`. To publish into a subdirectory instead, build with
   * VITE_BASE=/subdir/ — `src/main.tsx` feeds the same value to the router's
   * basename.
   *
   * A relative base ('./') deliberately is not used: assets would resolve
   * against the current URL, so a deep route such as /study/courses would look
   * for /study/assets/... and 404.
   */
  const base = env.VITE_BASE || '/'

  return {
    base,
    plugins: [react()],
    build: {
      // InfinityFree's free tier has no server-side compression control, so
      // keep the bundle honest and visible rather than silently large.
      chunkSizeWarningLimit: 600,
    },
  }
})
