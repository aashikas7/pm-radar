/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  basePath: "/pm-radar",
  trailingSlash: true,
  images: { unoptimized: true },
};
export default nextConfig;
