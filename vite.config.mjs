import { defineConfig, loadEnv, transformWithEsbuild } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'REACT_APP_');

  return {
    plugins: [
      {
        name: 'signaltrue-js-as-jsx',
        enforce: 'pre',
        transform(code, id) {
          if (!/\/src\/.*\.js$/.test(id)) return null;
          return transformWithEsbuild(code, id, { loader: 'jsx', jsx: 'automatic' });
        },
      },
      react(),
    ],
    define: {
      'process.env.NODE_ENV': JSON.stringify(mode),
      'process.env.REACT_APP_API_URL': JSON.stringify(env.REACT_APP_API_URL || ''),
    },
    build: {
      outDir: 'build',
      emptyOutDir: true,
      sourcemap: false,
    },
    server: {
      proxy: {
        '/api': 'http://localhost:8081',
      },
    },
    optimizeDeps: {
      esbuildOptions: {
        loader: { '.js': 'jsx' },
      },
    },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./src/setupTests.js'],
      include: ['src/**/*.{test,spec}.{js,jsx,ts,tsx}'],
      exclude: ['node_modules/**', 'backend/**', 'build/**'],
      css: true,
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json-summary', 'lcov'],
        thresholds: {
          statements: 46,
          branches: 37,
          functions: 34,
          lines: 50,
        },
      },
    },
  };
});
