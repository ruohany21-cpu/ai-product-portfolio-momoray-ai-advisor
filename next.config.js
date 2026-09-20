/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  // Keep the production client bundle on the verified published workflow even
  // if a stale Cloudflare Pages environment variable is still configured.
  env: {
    NEXT_PUBLIC_COZE_WORKFLOW_ID: "7684655278651277347",
  },
};

export default nextConfig;
