import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  /* Produces a self-contained server for the Docker image. */
  output: "standalone",

  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;