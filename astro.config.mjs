// @ts-check
import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';
import react from '@astrojs/react';
import keystatic from '@keystatic/astro';

// Pages are pre-rendered (static) for speed. Only the editor (/keystatic)
// and the form handler (/api/submit) run on Vercel as server functions.
export default defineConfig({
  site: 'https://hiddentreasuresmn.org',
  output: 'static',
  adapter: vercel(),
  integrations: [react(), keystatic()],
  // Old Squarespace addresses, so existing links, QR codes and bookmarks keep working
  redirects: {
    '/admin': '/keystatic',
    '/work': '/work-with-us',
    '/volunteer': '/work-with-us#volunteer',
    '/pickup': '/donate#pickup',
    '/pickups': '/donate#pickup',
    '/sales': '/news',
    '/events': '/news',
    '/about': '/our-story',
    '/search': '/',
    '/home': '/',
    '/email': '/#newsletter',
  },
});
