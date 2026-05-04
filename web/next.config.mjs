/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  
  // Turbopack configuration
  turbopack: {
    // Set the root directory for Turbopack
    root: process.cwd(),
  },
  
  // Configure TypeScript compiler options
  typescript: {
    // Ignore TypeScript errors during build
    ignoreBuildErrors: true,
  },
};

export default nextConfig;