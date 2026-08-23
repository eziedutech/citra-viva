import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Cloud Run runs the built server, and standalone keeps the image small
  // enough that a cold start is not the first thing a judge notices.
  output: 'standalone',
  reactStrictMode: true,
  // Next writes agent instruction files into this directory on every dev run.
  // The repository does not publish agent instruction files, and a generated
  // file that reappears after deletion is a permanent dirty diff.
  agentRules: false,
};

export default nextConfig;
