import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const npmCli = process.env.npm_execpath;
if (!npmCli) throw new Error('npm_execpath is required for reproducibility builds');

async function inventory(directory, prefix = '') {
  const entries = await readdir(directory, { withFileTypes: true });
  const result = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name, 'en'))) {
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) result.push(...await inventory(absolute, relative));
    else if (entry.isFile()) {
      const bytes = await readFile(absolute);
      result.push([relative, createHash('sha256').update(bytes).digest('hex')]);
    }
  }
  return result;
}

async function snapshot() {
  return {
    dist: await inventory(path.join(root, 'dist')),
    polyfills: createHash('sha256').update(await readFile(path.join(root, 'src', 'polyfills.ts'))).digest('hex'),
    sbom: createHash('sha256').update(await readFile(path.join(root, 'sbom.cdx.json'))).digest('hex')
  };
}

execFileSync(process.execPath, [npmCli, 'run', 'build'], { cwd: root, stdio: 'inherit' });
const first = await snapshot();
execFileSync(process.execPath, [npmCli, 'run', 'build'], { cwd: root, stdio: 'inherit' });
const second = await snapshot();
if (JSON.stringify(first) !== JSON.stringify(second)) throw new Error('Two clean builds produced different bytes');
console.log(`reproducible build: pass (${first.dist.length} dist files)`);
