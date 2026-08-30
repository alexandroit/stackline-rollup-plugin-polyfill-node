import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { materializeProductionClosure } from './production-closure.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const closure = await materializeProductionClosure(root);
await mkdir(path.join(root, 'dist'), { recursive: true });
await writeFile(
  path.join(root, 'dist', 'production-closure.json'),
  `${JSON.stringify(closure, null, 2)}\n`,
  'utf8'
);
