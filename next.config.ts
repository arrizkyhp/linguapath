import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@huggingface/transformers"],
  turbopack: {},
};

export default nextConfig;
