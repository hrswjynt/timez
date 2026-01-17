import { copyFileSync, cpSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');
const distDir = join(rootDir, 'dist');

console.log('Copying extension files to dist...');

// Ensure dist directory exists
if (!existsSync(distDir)) {
  mkdirSync(distDir, { recursive: true });
}

// Copy manifest.json to dist
copyFileSync(
  join(rootDir, 'manifest.json'),
  join(distDir, 'manifest.json')
);
console.log('  ✓ manifest.json');

// Copy background.js to dist
copyFileSync(
  join(rootDir, 'public', 'background.js'),
  join(distDir, 'background.js')
);
console.log('  ✓ background.js');

// Copy icons directory
const iconsDistDir = join(distDir, 'icons');
if (!existsSync(iconsDistDir)) {
  mkdirSync(iconsDistDir, { recursive: true });
}

cpSync(
  join(rootDir, 'public', 'icons'),
  iconsDistDir,
  { recursive: true }
);
console.log('  ✓ icons/');

console.log('\nExtension build complete!');
console.log(`Output directory: ${distDir}`);
console.log('\nTo load in Firefox:');
console.log('  1. Open Firefox and go to about:debugging');
console.log('  2. Click "This Firefox"');
console.log('  3. Click "Load Temporary Add-on"');
console.log('  4. Select the manifest.json file in the dist/ folder');
