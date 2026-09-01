import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  trailingSlash: true,
  typescript: {
    tsconfigPath: "tsconfig.azure.json",
  },
};

export default nextConfig;
