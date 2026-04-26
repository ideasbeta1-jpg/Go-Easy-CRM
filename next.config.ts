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
  },
});

const nextConfig: NextConfig = {
  turbopack: {},
  serverExternalPackages: ['@ffmpeg-installer/ffmpeg'],
};

export default withPWA(nextConfig);
