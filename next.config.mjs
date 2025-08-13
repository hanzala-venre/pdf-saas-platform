/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb', // Increase from default 1MB to 10MB for PDF uploads
    },
  },
  env: {
    // Set this in Vercel project settings to point to FastAPI deployment URL
    FASTAPI_BASE_URL: process.env.FASTAPI_BASE_URL,
  },
  webpack: (config, { isServer, dev }) => {
    // Handle react-pdf canvas and fs issues
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        canvas: false,
        stream: false,
        util: false,
      }
    }

    // Exclude react-pdf from server-side bundling to prevent DOMMatrix errors
    if (isServer) {
      config.externals = config.externals || []
      config.externals.push({
        'react-pdf': 'commonjs react-pdf',
        'pdfjs-dist': 'commonjs pdfjs-dist',
        'canvas': 'commonjs canvas'
      })
    }

    // Remove mini-css-extract-plugin to prevent conflicts
    if (!dev) {
      config.plugins = config.plugins.filter(
        plugin => plugin.constructor.name !== 'MiniCssExtractPlugin'
      )
    }

    return config
  },
}

export default nextConfig
