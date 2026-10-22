import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  // Ni la tienda ni el panel se muestran dentro de otros sitios (clickjacking).
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          // Antes la ponía el proxy inverso; en el hosting actual la pone la app.
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
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
