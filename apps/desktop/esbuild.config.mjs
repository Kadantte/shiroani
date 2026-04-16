import { build } from 'esbuild';
import { existsSync, readFileSync, rmSync, mkdirSync } from 'node:fs';
import { esbuildDecorators } from '@anatine/esbuild-decorators';

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));

// Clean dist/main/ before bundling to prevent stale artifact accumulation
const outdir = 'dist/main';
if (existsSync(outdir)) {
  rmSync(outdir, { recursive: true });
}
mkdirSync(outdir, { recursive: true });

// Externalize all npm dependencies — they're bundled by electron-builder at
// package time via node_modules.  Workspace packages are kept bundled (tiny)
// to avoid workspace-protocol resolution issues in production builds.
const external = [
  'electron',
  ...Object.keys(pkg.dependencies ?? {}).filter(
    (d) => !d.startsWith('@shiroani/')
  ),
];

await build({
  entryPoints: [
    'src/main/index.ts',
    'src/main/preload.ts',
    'src/main/menu-preload.ts',
    // Worker entry — built as a standalone CJS file emitted next to the main
    // bundle. scanner.service.ts resolves it via `path.join(__dirname,
    // 'scanner.worker.js')`. Keeping it a separate entry (instead of
    // require.resolve-ing the TS source) means we get tree-shaking +
    // sourcemaps for free and no runtime TypeScript dependency.
    'src/modules/local-library/scanner/scanner.worker.ts',
  ],
  entryNames: '[name]',
  bundle: true,
  platform: 'node',
  target: 'node22',
  format: 'cjs',
  outdir: 'dist/main',
  sourcemap: true,
  external,
  plugins: [
    esbuildDecorators({
      tsconfig: './tsconfig.build.json',
    }),
  ],
  logLevel: 'info',
});
