/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: [],
  },
  eslint: {
  ignoreDuringBuilds: true,
},
  images: {
    domains: [],
  },
};

module.exports = nextConfig;
