import { copyFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const esmDirectory = path.join(root, 'dist', 'es');
await mkdir(esmDirectory, { recursive: true });
await writeFile(path.join(esmDirectory, 'package.json'), '{\n  "type": "module"\n}\n', 'utf8');
await copyFile(path.join(root, 'dist', 'index.d.ts'), path.join(root, 'dist', 'index.d.mts'));
await copyFile(path.join(root, 'types', 'index.d.cts'), path.join(root, 'dist', 'index.d.cts'));
await copyFile(path.join(root, 'types', 'legacy.d.ts'), path.join(root, 'dist', 'legacy.d.ts'));
