import { execSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

const isWindows = os.platform() === 'win32';

if (!isWindows) {
  console.log('postinstall: non-Windows platform detected, skipping native install.');
  process.exit(0);
}

const root = process.cwd();
const pkgPath = path.join(root, 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const packages = [
  '@rollup/rollup-win32-x64-msvc',
  'lightningcss-win32-x64-msvc',
  '@tailwindcss/oxide-win32-x64-msvc',
];

const missing = packages.filter((name) => !pkg.devDependencies?.[name]);
if (missing.length === 0) {
  console.log('postinstall: all required Windows native packages are already present.');
  process.exit(0);
}

console.log('postinstall: Windows detected, installing missing native binaries:', missing.join(', '));
execSync(`pnpm add -Dw ${missing.join(' ')} -w`, {
  stdio: 'inherit',
});

console.log('postinstall: completed.');
