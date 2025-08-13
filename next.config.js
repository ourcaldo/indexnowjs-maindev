/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  webpack: (config, { isServer, webpack }) => {
    // Suppress critical dependency warnings from Supabase realtime
    config.plugins.push(
      new webpack.ContextReplacementPlugin(
        /\/node_modules\/@supabase\/realtime-js\//,
        (data) => {
          delete data.dependencies[0].critical;
          return data;
        }
      )
    )
    
    // Ignore warnings for websocket modules
    config.ignoreWarnings = [
      ...(config.ignoreWarnings || []),
      {
        module: /node_modules\/@supabase\/realtime-js/,
      },
      {
        message: /Critical dependency: the request of a dependency is an expression/,
      }
    ]
    
    return config
  },
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:5000', '0.0.0.0:5000', '*.replit.dev', '*.replit.app', '*.replit.co']
    }
  },
  allowedDevOrigins: ['*.replit.dev', '*.replit.app', '*.replit.co'],

  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization',
          },
        ],
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: '/api/:path*',
      },
    ];
  },
};

module.exports = nextConfig;