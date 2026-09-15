import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  srcDir: '.',
  vite: () => ({
    plugins: [tailwindcss()],
  }),
  manifest: {
    name: 'Tabin',
    description: 'Turn your New Tab into a visual home for your favorite websites.',
    version: '0.1.0',
    permissions: ['storage'],
  },
});
