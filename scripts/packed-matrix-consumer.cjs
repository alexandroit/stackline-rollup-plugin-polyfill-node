'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const mode = process.argv[2];
const source = `
  import { join } from 'node:path';
  import { URL, urlToHttpOptions } from 'node:url';
  import { formatWithOptions } from 'node:util';
  import types, { isMap } from 'node:util/types';
  const converted = urlToHttpOptions(new URL('https://user:p%40ss@[2001:db8::1]:8443/a?q=1#hash'));
  export const observed = {
    joined: join('a', 'b'),
    hostname: converted.hostname,
    port: converted.port,
    path: converted.path,
    auth: converted.auth,
    map: isMap(new Map()) && types.isMap(new Map()),
    formatted: formatWithOptions({}, '%s %d %j %%', 'value', '2', { ok: true })
  };
`;

function virtualEntry() {
  return {
    name: 'virtual-entry',
    resolveId(id) { return id === 'entry.js' ? id : null; },
    load(id) { return id === 'entry.js' ? source : null; }
  };
}

function onwarn(warning) {
  if (warning.code === 'UNRESOLVED_IMPORT' || warning.code === 'MISSING_EXPORT') {
    throw new Error(`${warning.code}: ${warning.message}`);
  }
}

function check(observed) {
  assert.strictEqual(observed.joined, 'a/b');
  assert.strictEqual(observed.hostname, '2001:db8::1');
  assert.strictEqual(observed.port, 8443);
  assert.strictEqual(observed.path, '/a?q=1');
  assert.strictEqual(observed.auth, 'user:p@ss');
  assert.strictEqual(observed.map, true);
  assert.strictEqual(observed.formatted, 'value 2 {"ok":true} %');
}

async function generate(format, plugin) {
  const { rollup } = require('rollup');
  const bundle = await rollup({
    input: 'entry.js',
    plugins: [virtualEntry(), plugin({ include: null })],
    onwarn
  });
  const output = await bundle.generate({ format, exports: format === 'cjs' ? 'named' : undefined });
  if (typeof bundle.close === 'function') await bundle.close();
  assert.ok(!output.output[0].code.includes('node:path'));
  return output.output[0].code;
}

async function main() {
  if (mode === 'cjs') {
    const loaded = require('@stackline/rollup-plugin-polyfill-node');
    const plugin = loaded.default || loaded;
    assert.strictEqual(typeof plugin, 'function');
    fs.writeFileSync('bundle.cjs', await generate('cjs', plugin));
    check(require(path.resolve('bundle.cjs')).observed);
    return;
  }

  if (mode === 'esm-build') {
    const loaded = await import('@stackline/rollup-plugin-polyfill-node');
    assert.strictEqual(typeof loaded.default, 'function');
    fs.writeFileSync('bundle.mjs', await generate('es', loaded.default));
    return;
  }

  if (mode === 'esm-evaluate') {
    const evaluated = await import(pathToFileURL(path.resolve('bundle.mjs')).href);
    check(evaluated.observed);
    return;
  }

  throw new Error(`Unknown packed consumer mode: ${mode || '<missing>'}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
