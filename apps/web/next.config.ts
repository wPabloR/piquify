import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  transpilePackages: ["@piquify/contracts"],
  outputFileTracingRoot: path.join(__dirname, "../.."),
};

export default nextConfig;
