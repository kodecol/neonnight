import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: true,
  // El indicador flotante de `next dev` tapa "Salir" en el panel; los errores siguen mostrándose en el overlay.
  devIndicators: false,
  images: {
    formats: ["image/avif", "image/webp"],
    // Fotos del catálogo subidas desde /admin a Cloudinary.
    remotePatterns: [{ protocol: "https", hostname: "res.cloudinary.com" }],
  },
  // Pagos y Cuenta pasaron a Ajustes (pestañas): los enlaces y marcadores viejos siguen sirviendo.
  async redirects() {
    return [
      { source: "/admin/pagos", destination: "/admin/ajustes/pagos", permanent: false },
      { source: "/admin/cuenta", destination: "/admin/ajustes/seguridad", permanent: false },
    ];
  },
  experimental: {
    // Las fotos del panel se suben por server action (máx. 8 MB por foto).
    serverActions: { bodySizeLimit: "10mb" },
  },
};

export default nextConfig;
