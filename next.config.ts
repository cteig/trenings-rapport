import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Tving nettleseren til alltid å bruke HTTPS, så påloggingsdata
        // (Garmin-passord) aldri kan sendes over ren HTTP.
        source: "/:path*",
        headers: [
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
