import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Imagen Docker mínima: copia solo lo necesario para `node server.js`.
  output: "standalone",
  cacheComponents: true,
  partialPrefetching: true,
  // El formulario de reclamo vive en /reclamos (ruta pedida); la raíz redirige allí antes de renderizar.
  async redirects() {
    return [{ source: "/", destination: "/reclamos", permanent: false }];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
