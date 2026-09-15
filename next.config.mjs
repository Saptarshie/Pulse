/** @type {import('next').NextConfig} */
// const nextConfig = {};
const nextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,OPTIONS,PATCH,DELETE,POST,PUT' },
          { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version' },
        ],
      },
    ];
  },
  experimental: {
    cpus: 1,
    serverActions: {
      allowedOrigins: ['localhost:3000', 'n2g9pcp2-3000.inc1.devtunnels.ms'],
    },
  },
images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '**',      // allow any port (e.g. 3000, 4000)
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'localhost',
        port: '**',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: '/**',
      },
    ]},
  // Ensure public directory is properly served
  assetPrefix: '',
  // Add webpack configuration here
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Don't resolve 'cloudinary' module on the client side
      config.resolve.fallback = { 
        ...config.resolve.fallback,
        cloudinary: false 
      };
    }
    return config;
  },
};

export default nextConfig;
