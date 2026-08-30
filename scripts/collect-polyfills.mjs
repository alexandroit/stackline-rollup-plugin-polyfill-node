import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const polyfillsRoot = path.join(root, 'polyfills');

async function listFiles(directory, prefix = '') {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name, 'en'))) {
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      files.push(...await listFiles(path.join(directory, entry.name), relative));
    } else if (entry.isFile()) {
      files.push(relative);
    }
  }
  return files;
}

const files = await listFiles(polyfillsRoot);
const contents = {};
for (const relative of files) {
  contents[relative] = await readFile(path.join(polyfillsRoot, relative), 'utf8');
}

await writeFile(
  path.join(root, 'src', 'polyfills.ts'),
  `export default ${JSON.stringify(contents)};\n`,
  'utf8'
);
