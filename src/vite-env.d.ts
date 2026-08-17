/// <reference types="vite/client" />

// Pulls in Vite's ambient types, notably `import.meta.env`. `src/main.tsx`
// reads `import.meta.env.BASE_URL` to keep the router's basename in step with
// the `base` set in vite.config.ts.
