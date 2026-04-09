import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  devIndicators: false,
  output: "standalone",
  allowedDevOrigins: ["192.168.1.12", "172.17.160.1"],
};

export default nextConfig;
