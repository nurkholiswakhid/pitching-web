import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Pastikan PDF.js worker file ter-serve dengan MIME type JS module yang benar
        source: "/pdf.worker.min.mjs",
        headers: [
          { key: "Content-Type", value: "text/javascript" },
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ];
  },
};

export default nextConfig;
