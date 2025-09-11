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
      allowedOrigins: [`localhost:5000`, `0.0.0.0:5000`, '*.replit.dev', '*.replit.app', '*.replit.co', '*']
    }
  },
  allowedDevOrigins: ['*.replit.dev', '*.replit.app', '*.replit.co', '*.janeway.replit.dev', '*.riker.replit.dev', '*.spock.replit.dev', 'localhost:5000', '0.0.0.0:5000', '127.0.0.1:5000'],

  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },
  // Reduce memory usage during build
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  // Reduce concurrent builds  
  experimental: {
    serverActions: {
      allowedOrigins: [`localhost:5000`, `0.0.0.0:5000`, '*.replit.dev', '*.replit.app', '*.replit.co', '*']
    },
    workerThreads: false,
    cpus: 10,
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // Basic Security Headers (Existing)
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
          // CORS Headers (Enhanced for Security)
          {
            key: 'Access-Control-Allow-Origin',
            value: process.env.NODE_ENV === 'production' 
              ? 'https://indexnow.studio' // Production domain only
              : '*', // Development flexibility
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization',
          },
          {
            key: 'Vary',
            value: 'Origin',
          },
          // ENHANCEMENT #3: Advanced Security Headers
          // Content Security Policy (CSP) - XSS Protection  
          {
            key: 'Content-Security-Policy',
            value: process.env.NODE_ENV === 'production' 
              ? "default-src 'self'; script-src 'self' 'unsafe-inline' https://base.indexnow.studio https://*.supabase.co; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https: blob:; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self' https://base.indexnow.studio https://*.supabase.co https://*.supabase.io wss://*.supabase.co wss://*.supabase.io; frame-src 'self' https://app.midtrans.com https://app.sandbox.midtrans.com; media-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests;"
              : "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https: blob:; font-src 'self' data:; connect-src 'self' https: wss: ws:; media-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self';"
          },
          // HTTP Strict Transport Security (HSTS) - Production Only
          ...(process.env.NODE_ENV === 'production' ? [{
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          }] : []),
          // Permissions Policy - Control Browser Features  
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), screen-wake-lock=(), web-share=(), fullscreen=(self), document-domain=()',
          },
          // Cross-Origin Protection (Enhanced)
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'unsafe-none', // Keep permissive for now to avoid breaking resources
          },
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin-allow-popups',
          },
          {
            key: 'Cross-Origin-Resource-Policy',
            value: process.env.NODE_ENV === 'production' ? 'same-site' : 'cross-origin',
          },
          // Additional Security Headers
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'off',
          },
          {
            key: 'X-Download-Options',
            value: 'noopen',
          },
          {
            key: 'X-Permitted-Cross-Domain-Policies',
            value: 'none',
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