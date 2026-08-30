import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const constants = await readFile(path.join(root, 'polyfills', 'constants.js'));
const constantsHash = createHash('sha256').update(constants).digest('hex');
if (constantsHash !== 'ba2bff6ccb95b773a7ab6460e633a64ff299796025c1e4317ee8f95a22109b6a') {
  throw new Error(`The frozen cross-platform compatibility constants changed: ${constantsHash}`);
}

const packageJson = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
for (const removed of ['browserify-fs', 'crypto-browserify', 'buffer-es6', 'process-es6', 'glob', 'np', 'serve']) {
  if (packageJson.dependencies?.[removed] || packageJson.devDependencies?.[removed]) {
    throw new Error(`Removed generator dependency returned: ${removed}`);
  }
}

for (const relative of ['src/index.ts', 'src/modules.ts', 'test/index.js', 'test/compatibility.test.js']) {
  const source = await readFile(path.join(root, relative), 'utf8');
  if (/\.(only|skip)\s*\(/.test(source)) throw new Error(`Focused or skipped test found in ${relative}`);
}

console.log('source invariants: pass');
