/** @type {import('next').NextConfig} */
const nextConfig = {
  // O Dockerfile do Épico 1 copia `.next/standalone`, então o output não pode
  // mudar sem mexer nos dois lados.
  output: 'standalone',
};

module.exports = nextConfig;
