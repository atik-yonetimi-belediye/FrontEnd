import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    include: ['src/test/**/*.{test,spec}.{js,jsx}'],
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary'],
      include: ['src/components/Button.jsx', 'src/components/Input.jsx', 'src/utils/authRoutes.js'],
      thresholds: { lines: 80, functions: 80, statements: 80, branches: 70 },
    },
  },
});
