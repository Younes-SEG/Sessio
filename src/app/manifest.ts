import type { MetadataRoute } from 'next';
import { APP_BACKGROUND } from '@/lib/theme';

// Public and identical for everyone: served outside the sign-in gate (see src/proxy.ts),
// because browsers fetch the manifest without cookies.
// A manifest has one theme colour; dark mode is set per page in the root layout's viewport.

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'Sessio',
    short_name: 'Sessio',
    description: 'Your courses, tasks, grades, and study plans in one personal workspace.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: APP_BACKGROUND.light,
    theme_color: APP_BACKGROUND.light,
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      {
        src: '/icons/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
