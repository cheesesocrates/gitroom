import { fileURLToPath } from 'node:url';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // pin the project root so a stray lockfile higher up the disk isn't mistaken for it
  turbopack: { root: fileURLToPath(new URL('.', import.meta.url)) },
  // the link-preview images read their fonts and background art from assets/
  outputFileTracingIncludes: { '/u/[login]/opengraph-image': ['./assets/**/*'] },
};
export default nextConfig;
