import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const esmDirectory = path.join(root, 'dist', 'es');
await mkdir(esmDirectory, { recursive: true });
await writeFile(path.join(esmDirectory, 'package.json'), '{\n  "type": "module"\n}\n', 'utf8');

async function copyTextWithLf(source, target) {
  const contents = (await readFile(source, 'utf8')).replace(/\r\n?/g, '\n');
  await writeFile(target, contents, 'utf8');
}

await copyTextWithLf(path.join(root, 'dist', 'index.d.ts'), path.join(root, 'dist', 'index.d.mts'));
await copyTextWithLf(path.join(root, 'types', 'index.d.cts'), path.join(root, 'dist', 'index.d.cts'));
await copyTextWithLf(path.join(root, 'types', 'legacy.d.ts'), path.join(root, 'dist', 'legacy.d.ts'));
