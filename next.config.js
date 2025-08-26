/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  async redirects() {
    return [
      // /report/<uuid> -> /report?resultId=<uuid>
      {
        source:
          "/report/:id([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})",
        destination: "/report?resultId=:id",
        permanent: false,
      },
      // /consult -> /consult/start
      {
        source: "/consult",
        destination: "/consult/start",
        permanent: false,
      },
    ];
  },
};

module.exports = nextConfig;
