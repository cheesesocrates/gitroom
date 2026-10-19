import { fileURLToPath } from 'node:url';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // pin the project root so a stray lockfile higher up the disk isn't mistaken for it
  turbopack: { root: fileURLToPath(new URL('.', import.meta.url)) },
};
export default nextConfig;
