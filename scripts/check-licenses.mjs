import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const required = [
  'LICENSE.md',
  'NOTICE',
  'THIRD_PARTY_NOTICES.md',
  'VENDORED_COMPONENTS.json',
  'polyfills/LICENSE-browserify-fs.txt',
  'polyfills/LICENSE-buffer-es6.txt',
  'polyfills/LICENSE-crypto-browserify.txt',
  'polyfills/LICENSE-process-es6.txt',
  'polyfills/__zlib-lib/LICENSE',
  'sbom.cdx.json'
];
for (const relative of required) await readFile(path.join(root, relative));

const license = await readFile(path.join(root, 'LICENSE.md'), 'utf8');
for (const text of ['Copyright (c) 2020 Fred K. Schott', 'Copyright (c) 2019 these people']) {
  if (!license.includes(text)) throw new Error(`Missing upstream license notice: ${text}`);
}

const notices = await readFile(path.join(root, 'THIRD_PARTY_NOTICES.md'), 'utf8');
for (const text of ['buffer-es6', 'process-es6', 'Node.js', 'pako', 'not shipped as runtime implementations']) {
  if (!notices.includes(text)) throw new Error(`Missing third-party notice: ${text}`);
}

const manifest = JSON.parse(await readFile(path.join(root, 'VENDORED_COMPONENTS.json'), 'utf8'));
if (manifest.upstream.commit !== '31face71b94b8408a907f04753318dff589adc2f') {
  throw new Error('Vendored manifest does not identify the exact upstream release commit');
}

const sbom = JSON.parse(await readFile(path.join(root, 'sbom.cdx.json'), 'utf8'));
const fileComponents = new Map(
  sbom.components
    .filter((component) => component.type === 'file')
    .map((component) => [component.name, component])
);
for (const [name, component] of fileComponents) {
  const bytes = await readFile(path.join(root, name));
  const actual = createHash('sha256').update(bytes).digest('hex');
  if (component.hashes?.[0]?.content !== actual) throw new Error(`SBOM hash mismatch for ${name}`);
}
if (fileComponents.size < 40) throw new Error(`Incomplete vendored file inventory: ${fileComponents.size}`);
console.log(`license and vendored SBOM checks: pass (${fileComponents.size} files)`);
