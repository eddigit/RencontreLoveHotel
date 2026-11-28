/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    // Build metadata only: this is deliberately a short commit identifier,
    // never runtime configuration or a user-specific value.
    NEXT_PUBLIC_BUILD_VERSION: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) || 'local'
  },
  outputFileTracingIncludes: {
    '/admin/idees': ['./migrations/20261124_community_feedback_canonical.sql'],
    '/discover': ['./migrations/20261124_community_feedback_canonical.sql']
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    unoptimized: true,
    domains: ['cmxmnsgbmhgpgxopmtua.supabase.co'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cmxmnsgbmhgpgxopmtua.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: '*.public.blob.vercel-storage.com',
        pathname: '/**',
      },
    ],
  },
}

export default nextConfig
