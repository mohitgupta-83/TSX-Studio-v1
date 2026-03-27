/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    config.externals.push("esbuild");
    return config;
  },
  serverExternalPackages: ["@prisma/client", "@remotion/bundler", "@remotion/renderer", "ffmpeg-static"],
  output: "standalone",
  eslint: {
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;
