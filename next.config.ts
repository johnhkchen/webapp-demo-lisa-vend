import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Deploy gate (T-005-02-01, E-005 / P3): `npm run build` is the Vercel build command
  // (see vercel.json). Pin the type-check escape hatch OFF so a type/compile error always
  // fails the production build — and therefore blocks promotion — instead of silently
  // shipping a broken page. This mirrors the Next.js default; stating it makes any future
  // weakening of the gate a visible, reviewable diff rather than a silent inheritance.
  // (Next.js 16 removed the `eslint` config key: `next build` no longer runs ESLint —
  // lint is enforced separately via `npm run lint`. So the build gate is compile + types.)
  typescript: {
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
