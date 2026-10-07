import { build } from 'vite';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
await build({
  root,
  configLoader: 'native',
  mode: 'review',
  build: {
    outDir: path.resolve(root, '../../work/editor-review-dist'),
    emptyOutDir: false,
    rollupOptions: { input: path.resolve(root, 'tests/review.html') },
  },
});
