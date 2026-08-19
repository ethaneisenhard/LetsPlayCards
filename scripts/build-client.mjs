import { build } from 'esbuild';

await build({
  entryPoints: ['src/client/main.tsx'],
  bundle: true,
  minify: true,
  format: 'esm',
  jsx: 'automatic',
  target: 'es2022',
  outfile: 'public/client.js',
  define: { 'process.env.NODE_ENV': '"production"' },
  logLevel: 'info',
});
