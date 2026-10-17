import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  target: 'es2022',
  // game-core stays a regular dependency; the JSON packs are bundled in.
  external: ['@khuuramch/game-core'],
});
