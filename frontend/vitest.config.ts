import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    // Fixa NODE_ENV=test em vez de herdar do ambiente. Com NODE_ENV=production
    // o React carrega o build de produção e `React.act` some, quebrando todo
    // render do Testing Library. O CI não define NODE_ENV, mas quem roda
    // `npm test` num shell com NODE_ENV=production precisa que funcione.
    env: { NODE_ENV: 'test' },
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
