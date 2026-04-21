import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow @react-three/fiber and three.js to be bundled cleanly
  transpilePackages: ["three", "@react-three/fiber", "@react-three/drei"],

  // Empty turbopack config — silences the "no turbopack config" warning.
  // Browser-only libs (html5-qrcode, three.js) are loaded client-side via dynamic().
  turbopack: {},

  // Allow cross-origin requests from signaling server in dev
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Cross-Origin-Opener-Policy",  value: "same-origin-allow-popups" },
          { key: "Cross-Origin-Embedder-Policy", value: "unsafe-none" },
        ],
      },
    ];
  },
};

export default nextConfig;
