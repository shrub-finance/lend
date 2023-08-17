const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config, options) => {
    // Add the common folder to the compilation.
    // This will make sure it's transpiled.
    config.module.rules.push({
      test: /\.tsx?$/,
      include: [path.resolve(__dirname, '../common')],
      use: [options.defaultLoaders.babel],
    });
    return config;
  }
}

module.exports = nextConfig
