/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack(config) {
    config.watchOptions = {
      ...config.watchOptions,
      ignored: ["**/.next/**", "**/node_modules/**"]
    };

    return config;
  }
};

export default nextConfig;
