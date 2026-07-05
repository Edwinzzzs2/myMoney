import type { NextConfig } from 'next'

type RuntimeCachingEntry = {
  options?: {
    cacheName?: string
  }
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: {},
  },
}

const isDev = process.env.NODE_ENV === 'development'

const config = isDev
  ? nextConfig
  : (() => {
      const defaultRuntimeCaching = require('next-pwa/cache') as RuntimeCachingEntry[]
      const withPWA = require('next-pwa')({
        dest: 'public',
        register: true,
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        dynamicStartUrl: true,
        runtimeCaching: defaultRuntimeCaching.filter((entry) => entry.options?.cacheName !== 'apis'),
      })

      return withPWA(nextConfig)
    })()

export default config
