/** @type {import('next').NextConfig} */
const nextConfig = {
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
