/**
 * Build the native addon (desktop_overlay) only on Windows.
 * On other platforms the overlay uses an Electron BrowserWindow instead,
 * so there is nothing to compile.
 */

import { execSync } from 'child_process';
import process from 'process';

if (process.platform !== 'win32') {
  console.log('Skipping native addon build (not Windows — macOS overlay uses BrowserWindow)');
  process.exit(0);
}

try {
  execSync('node-gyp rebuild', { stdio: 'inherit', cwd: process.cwd() });
} catch (error) {
  console.error('Native addon build failed:', error.message);
  process.exit(1);
}
