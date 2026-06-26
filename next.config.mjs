/** @type {import('next').NextConfig} */
const nextConfig = {
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
    ],
  },
}

export default nextConfig
