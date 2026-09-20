import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'GALX — Images and Ideas',
    short_name: 'GALX',
    description: 'Create images in GALX and explore public creations powered by GALX Nova.',
    start_url: '/',
    display: 'standalone',
    background_color: '#07080d',
    theme_color: '#07080d',
    categories: ['creativity', 'productivity', 'utilities', 'business'],
    icons: [
      {
        src: '/icon.png',
        sizes: '32x32',
        type: 'image/png',
      },
      {
        src: '/apple-icon.png',
        sizes: '180x180',
        type: 'image/png',
      },
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  };
}
