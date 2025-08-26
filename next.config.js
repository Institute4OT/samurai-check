/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      // 相談導線だけ維持
      {
        source: '/consult',
        destination: '/consult/start',
        permanent: false,
      },
    ];
  },
};

module.exports = nextConfig;
