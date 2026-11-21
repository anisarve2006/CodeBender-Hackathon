import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Family Care Hub',
    short_name: 'CareHub',
    description: 'Coordinate elder care across distributed families with clarity and peace of mind.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#0284c7',
    icons: [
      {
        src: '/favicon.ico',
        sizes: '48x48 72x72 96x96 128x128 256x256',
        type: 'image/x-icon',
      },
    ],
  };
}
