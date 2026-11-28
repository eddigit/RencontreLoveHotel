import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'Joug Rencontre',
    short_name: 'Joug',
    description: 'Le cercle des rencontres, des sorties et des lieux partenaires.',
    lang: 'fr',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#171819',
    theme_color: '#191714',
    icons: [
      { src: '/icons/joug-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/joug-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/joug-maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/icons/joug-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
    ]
  }
}
