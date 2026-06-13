import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  // We don't disable in dev if we want to test PWA, but it's usually better to disable it to avoid caching issues during development.
  // We'll set it to false for now so the user can test it during dev
  register: true,
  workboxOptions: {
    skipWaiting: false,
    clientsClaim: true,
  },
});

const nextConfig: NextConfig = {
  turbopack: {},
  serverExternalPackages: ['@ffmpeg-installer/ffmpeg'],
  // Tree-shaking dirigido para librerías con muchos exports: solo se incluye en
  // el bundle lo que realmente se importa (iconos/funciones usados), no el paquete entero.
  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts', 'date-fns'],
  },
  images: {
    // Optimización automática (AVIF/WebP, redimensionado) para imágenes remotas.
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      { protocol: 'https', hostname: '**.supabase.co' },   // Supabase Storage (catálogo, logos, avatares)
      { protocol: 'https', hostname: 'ui-avatars.com' },    // avatares generados
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
  },
};

export default withPWA(nextConfig);
