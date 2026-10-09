import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://qeva.org',
  output: 'static',
  build: { format: 'file' },
});
