import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const node = process.execPath;
const typescript39 = path.join(root, 'node_modules', 'typescript-3-9', 'bin', 'tsc');
const temporary = await mkdtemp(path.join(os.tmpdir(), 'stackline-rollup-polyfill-packed-'));

function run(command, args, cwd, checkWarnings = true) {
  const result = spawnSync(command, args, { cwd, encoding: 'utf8' });
  const output = `${result.stdout || ''}${result.stderr || ''}`;
  if (result.status !== 0) throw new Error(`${command} ${args.join(' ')} failed:\n${output}`);
  if (checkWarnings && /npm (?:warn|WARN)|deprecated|vulnerabilit(?:y|ies)/.test(output)) {
    throw new Error(`Unexpected install warning in ${cwd}:\n${output}`);
  }
  return result.stdout;
}

const smokeSource = String.raw`
const assert = require('node:assert/strict');
const rollup = require('rollup');
const requested = process.argv[2];
const loaded = require(requested);
const polyfills = loaded.default || loaded;
assert.equal(typeof polyfills, 'function');

const virtual = (source) => ({
  name: 'virtual-entry',
  resolveId(id) { return id === 'entry' ? id : null; },
  load(id) { return id === 'entry' ? source : null; }
});

(async () => {
  const source = [
    "import path from 'node:path'",
    "import { URL, urlToHttpOptions } from 'node:url'",
    "import { types, formatWithOptions } from 'node:util'",
    "export const result = [path.join('a','b'), typeof URL, typeof urlToHttpOptions, types.isMap(new Map()), formatWithOptions({}, '%s', 'ok')]"
  ].join(';');
  const bundle = await rollup.rollup({ input: 'entry', plugins: [virtual(source), polyfills({ include: null })] });
  const generated = await bundle.generate({ format: 'esm' });
  assert(!generated.output[0].code.includes("from 'node:path'"));

  await assert.rejects(
    () => rollup.rollup({
      input: 'entry',
      plugins: [virtual("import { readFile } from 'node:fs'; export { readFile }"), polyfills({ include: null })]
    }),
    (error) => {
      assert.equal(error.code, 'PLUGIN_ERROR');
      assert.equal(error.pluginCode, 'UNSUPPORTED_NODE_BUILTIN');
      assert.equal(
        error.message,
        'The Node.js "fs" builtin is intentionally unsupported in browser bundles. ' +
          'Provide a browser implementation or mark the import as external.'
      );
      return true;
    }
  );

  const imported = await import(requested);
  assert.equal(typeof imported.default, 'function');
})().catch((error) => { console.error(error); process.exitCode = 1; });
`;

try {
  const packed = JSON.parse(execFileSync(npm, [
    'pack', '--json', '--ignore-scripts', '--pack-destination', temporary
  ], { cwd: root, encoding: 'utf8' }));
  const tarball = path.join(temporary, packed[0].filename);

  for (const mode of ['scoped', 'legacy-key']) {
    const consumer = path.join(temporary, mode);
    const dependencyName = mode === 'scoped'
      ? '@stackline/rollup-plugin-polyfill-node'
      : 'rollup-plugin-polyfill-node';
    const manifest = {
      private: true,
      dependencies: {
        [dependencyName]: `file:${tarball}`,
        rollup: '4.63.1'
      }
    };
    await import('node:fs/promises').then(({ mkdir }) => mkdir(consumer, { recursive: true }));
    await writeFile(path.join(consumer, 'package.json'), `${JSON.stringify(manifest, null, 2)}\n`);
    await writeFile(path.join(consumer, 'smoke.cjs'), smokeSource);
    await writeFile(path.join(consumer, 'types.ts'), `
import nodePolyfills, { NodePolyfillsOptions } from ${JSON.stringify(dependencyName)};
const options: NodePolyfillsOptions = { baseDir: '/', crypto: false, include: null };
const plugin = nodePolyfills(options);
const name: string = plugin.name;
void name;
`);
    await writeFile(path.join(consumer, 'tsconfig.types.json'), `${JSON.stringify({
      compilerOptions: {
        strict: true,
        target: 'ES2018',
        module: 'commonjs',
        moduleResolution: 'node',
        types: [],
        noEmit: true
      },
      files: ['types.ts']
    }, null, 2)}\n`);
    run(npm, ['install', '--ignore-scripts', '--no-fund', '--no-audit'], consumer);
    run(node, ['smoke.cjs', dependencyName], consumer);
    run(node, [typescript39, '-p', 'tsconfig.types.json'], consumer);
    const tree = JSON.parse(run(npm, ['ls', '--all', '--json'], consumer));
    if (tree.problems?.length) throw new Error(`${mode} npm ls problems: ${tree.problems.join('; ')}`);
    const audit = JSON.parse(run(npm, ['audit', '--json', '--audit-level=low'], consumer, false));
    if (audit.metadata?.vulnerabilities?.total !== 0) throw new Error(`${mode} audit is not clean`);
  }
  console.log('packed scoped and historical-key consumers: pass');
} finally {
  await rm(temporary, { recursive: true, force: true });
}
