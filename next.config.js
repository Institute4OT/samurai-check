/** @type {import('next').NextConfig} */
const nextConfig = {
  // ほかの設定があればそのまま残す
  async rewrites() {
    return [
      // /report/<uuid> → /report?resultId=<uuid>
      { source: '/report/:id', destination: '/report?resultId=:id' },

      // /consult → /consult/start
      { source: '/consult', destination: '/consult/start' },
    ];
  },
};

module.exports = nextConfig;
