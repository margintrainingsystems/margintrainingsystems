import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import netlify from "@netlify/vite-plugin-tanstack-start";

// Config nativa de TanStack Start + Netlify (reemplaza el wrapper
// @lovable.dev/vite-tanstack-config, que targeteaba Cloudflare por default
// y dependía del runtime propio de Lovable). El sitio ahora se despliega
// 100% en Netlify + Supabase, sin intermediarios de Lovable.
export default defineConfig({
  plugins: [
    tsConfigPaths(),
    tailwindcss(),
    tanstackStart({
      // Redirige el entry del servidor de TanStack Start a src/server.ts
      // (nuestro wrapper de captura de errores en SSR).
      server: { entry: "server" },
    }),
    viteReact(),
    netlify(),
  ],
});
