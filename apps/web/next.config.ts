import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@eduferma/api-client",
    "@eduferma/api-contract",
    "@eduferma/config",
    "@eduferma/core",
    "@eduferma/db",
    "@eduferma/ui",
    "@eduferma/validators"
  ]
};

export default nextConfig;
