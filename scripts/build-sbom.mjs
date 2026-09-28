import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { materializeProductionClosure } from './production-closure.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const packageJson = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
const vendored = JSON.parse(await readFile(path.join(root, 'VENDORED_COMPONENTS.json'), 'utf8'));
const closure = await materializeProductionClosure(root);

function sha256(content) {
  return createHash('sha256').update(content).digest('hex');
}

async function listFiles(directory, prefix = '') {
  const entries = await readdir(directory, { withFileTypes: true });
  const result = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name, 'en'))) {
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) result.push(...await listFiles(path.join(directory, entry.name), relative));
    else if (entry.isFile()) result.push(relative);
  }
  return result;
}

const runtimeComponents = closure.nodes.map((metadata) => {
    const name = metadata.name;
    return {
      type: 'library',
      name,
      version: metadata.version,
      licenses: metadata.license ? [{ license: { id: metadata.license } }] : undefined,
      purl: `pkg:npm/${name.split('/').map(encodeURIComponent).join('/')}@${encodeURIComponent(metadata.version)}`,
      properties: [
        { name: 'stackline:install-path', value: metadata.location },
        { name: 'stackline:optional', value: String(Boolean(metadata.optional)) },
        { name: 'stackline:peer', value: String(Boolean(metadata.peer)) }
      ]
    };
  });

const vendoredFiles = [];
for (const relative of await listFiles(path.join(root, 'polyfills'))) {
  const bytes = await readFile(path.join(root, 'polyfills', relative));
  vendoredFiles.push({
    type: 'file',
    name: `polyfills/${relative}`,
    hashes: [{ alg: 'SHA-256', content: sha256(bytes) }],
    properties: [{ name: 'stackline:bundled', value: 'true' }]
  });
}

const sourceGroups = vendored.components.map((component) => ({
  type: 'library',
  name: component.name,
  version: component.version || 'vendored-at-upstream-0.13.0',
  licenses: component.license && !component.license.startsWith('MIXED')
    ? [{ expression: component.license }]
    : undefined,
  externalReferences: component.source
    ? [{ type: 'vcs', url: component.source }]
    : undefined,
  properties: [
    { name: 'stackline:kind', value: component.kind },
    { name: 'stackline:notice', value: component.notice }
  ]
}));

const digest = sha256(`${packageJson.name}@${packageJson.version}`);
const uuid = `${digest.slice(0, 8)}-${digest.slice(8, 12)}-4${digest.slice(13, 16)}-a${digest.slice(17, 20)}-${digest.slice(20, 32)}`;
const sbom = {
  bomFormat: 'CycloneDX',
  specVersion: '1.6',
  serialNumber: `urn:uuid:${uuid}`,
  version: 1,
  metadata: {
    component: {
      type: 'library',
      name: packageJson.name,
      version: packageJson.version,
      purl: `pkg:npm/%40stackline/rollup-plugin-polyfill-node@${packageJson.version}`
    },
    properties: [
      { name: 'stackline:upstream-commit', value: vendored.upstream.commit },
      { name: 'stackline:vendored-file-count', value: String(vendoredFiles.length) },
      { name: 'stackline:production-node-count-including-root', value: String(closure.nodeCountIncludingRoot) }
    ]
  },
  components: [...runtimeComponents, ...sourceGroups, ...vendoredFiles]
};

await writeFile(path.join(root, 'sbom.cdx.json'), `${JSON.stringify(sbom, null, 2)}\n`, 'utf8');
