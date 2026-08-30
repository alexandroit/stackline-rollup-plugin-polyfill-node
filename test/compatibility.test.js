const assert = require('assert');
const fs = require('fs');
const Module = require('module');
const path = require('path');
const vm = require('vm');
const rollup = require('rollup');
const installedTypeScript = require('typescript');
const ts = typeof installedTypeScript.transpileModule === 'function'
  ? installedTypeScript
  : require('typescript-3-9');
const nativeUtil = require('util');

const projectRoot = path.resolve(__dirname, '..');
const examplesRoot = path.join(__dirname, 'examples');
const nodePolyfills = loadSourcePlugin();

function collectPolyfillSources(directory, baseDirectory, sources) {
  fs.readdirSync(directory, { withFileTypes: true }).forEach(entry => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      collectPolyfillSources(entryPath, baseDirectory, sources);
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      const relativePath = path.relative(baseDirectory, entryPath).split(path.sep).join('/');
      sources[relativePath] = fs.readFileSync(entryPath, 'utf8');
    }
  });
  return sources;
}

function loadSourcePlugin() {
  const polyfillsPath = path.join(projectRoot, 'src', 'polyfills.ts');
  const indexPath = path.join(projectRoot, 'src', 'index.ts');
  const modulesPath = path.join(projectRoot, 'src', 'modules.ts');
  const previousTsLoader = require.extensions['.ts'];
  const previousPolyfillsModule = require.cache[polyfillsPath];
  const sources = collectPolyfillSources(
    path.join(projectRoot, 'polyfills'),
    path.join(projectRoot, 'polyfills'),
    Object.create(null)
  );

  require.extensions['.ts'] = function transpileTypeScript(module, filename) {
    const source = fs.readFileSync(filename, 'utf8');
    const output = ts.transpileModule(source, {
      compilerOptions: {
        esModuleInterop: true,
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2019
      },
      fileName: filename
    }).outputText;
    module._compile(output, filename);
  };

  const polyfillsModule = new Module(polyfillsPath, module);
  polyfillsModule.filename = polyfillsPath;
  polyfillsModule.paths = Module._nodeModulePaths(path.dirname(polyfillsPath));
  polyfillsModule.exports = { __esModule: true, default: sources };
  polyfillsModule.loaded = true;
  require.cache[polyfillsPath] = polyfillsModule;
  delete require.cache[indexPath];
  delete require.cache[modulesPath];

  try {
    return require(indexPath).default;
  } finally {
    if (previousTsLoader) {
      require.extensions['.ts'] = previousTsLoader;
    } else {
      delete require.extensions['.ts'];
    }
    if (previousPolyfillsModule) {
      require.cache[polyfillsPath] = previousPolyfillsModule;
    } else {
      delete require.cache[polyfillsPath];
    }
  }
}

async function bundleFixture(filename, pluginOptions) {
  const warnings = [];
  const options = Object.assign({ include: null }, pluginOptions);
  const bundle = await rollup.rollup({
    input: path.join(examplesRoot, filename),
    plugins: [nodePolyfills(Object.freeze(options))],
    onwarn(warning) {
      warnings.push(warning);
    }
  });

  try {
    const generated = await bundle.generate({ format: 'cjs', exports: 'named' });
    return {
      code: generated.output[0].code,
      warnings
    };
  } finally {
    await bundle.close();
  }
}

function runCommonJs(code) {
  const exports = {};
  const context = vm.createContext({
    clearInterval,
    clearTimeout,
    console,
    exports,
    module: { exports },
    setInterval,
    setTimeout,
    URL,
    URLSearchParams
  });
  context.self = context;
  new vm.Script(code).runInContext(context);
  return context.module.exports;
}

async function expectMissingExport(filename, exportName, moduleName, pluginOptions) {
  const warnings = [];
  const options = Object.assign({ include: null }, pluginOptions);
  await assert.rejects(
    rollup.rollup({
      input: path.join(examplesRoot, filename),
      plugins: [nodePolyfills(options)],
      onwarn(warning) {
        warnings.push(warning);
      }
    }),
    error => {
      assert.strictEqual(error.code, 'MISSING_EXPORT');
      assert.match(error.message, new RegExp('"' + exportName + '" is not exported'));
      assert.ok(error.message.includes('polyfill-node.' + moduleName + '.js'));
      return true;
    }
  );
  assert.ok(!warnings.some(warning => warning.code === 'UNRESOLVED_IMPORT'));
}

async function expectUnsupportedBuiltin(importStatement, moduleName, filename) {
  const input = filename ? path.join(examplesRoot, filename) : '\0unsupported-builtin-entry';
  const warnings = [];
  const virtualEntry = {
    name: 'unsupported-builtin-entry',
    resolveId(importee) {
      return importee === input ? input : null;
    },
    load(id) {
      return id === input ? importStatement : null;
    }
  };

  await assert.rejects(
    rollup.rollup({
      input,
      plugins: filename
        ? [nodePolyfills({ include: null })]
        : [virtualEntry, nodePolyfills({ include: null })],
      onwarn(warning) {
        warnings.push(warning);
      }
    }),
    error => {
      assert.strictEqual(error.code, 'PLUGIN_ERROR');
      assert.strictEqual(error.pluginCode, 'UNSUPPORTED_NODE_BUILTIN');
      assert.strictEqual(error.plugin, 'polyfill-node');
      assert.strictEqual(error.hook, 'resolveId');
      assert.strictEqual(
        error.message,
        'The Node.js "' + moduleName + '" builtin is intentionally unsupported in browser bundles. ' +
        'Provide a browser implementation or mark the import as external.'
      );
      return true;
    }
  );
  assert.ok(!warnings.some(warning => warning.code === 'UNRESOLVED_IMPORT'));
}

describe('source compatibility', function() {
  this.timeout(10000);

  it('bundles bare path and node:path identically with Rollup 4', async function() {
    assert.match(rollup.VERSION, /^4\./);
    const generated = await bundleFixture('compat-node-path.js');
    const result = runCommonJs(generated.code).pathCompatibility;

    assert.strictEqual(result.bareJoin, 'alpha/beta');
    assert.strictEqual(result.nodeJoin, result.bareJoin);
    assert.strictEqual(result.bareNormalize, 'beta');
    assert.strictEqual(result.nodeNormalize, result.bareNormalize);
    assert.strictEqual(result.defaultJoinMatches, true);
    assert.ok(!generated.warnings.some(warning => warning.code === 'UNRESOLVED_IMPORT'));
    assert.ok(!generated.code.includes('node:path'));
  });

  it('normalizes only represented Node built-ins', function() {
    const plugin = nodePolyfills({ include: null });
    const barePath = plugin.resolveId('path');
    const nodePath = plugin.resolveId('node:path');

    assert.strictEqual(nodePath.id, barePath.id);
    assert.strictEqual(plugin.resolveId('node:util/types').id, plugin.resolveId('util/types').id);
    assert.strictEqual(plugin.resolveId('node:global'), null);
    assert.strictEqual(plugin.resolveId('node:not-a-real-builtin'), null);
  });

  it('normalizes injected Windows filenames to stable POSIX paths', function() {
    const plugin = nodePolyfills({ baseDir: 'C:\\workspace\\package', include: null });
    const importer = 'C:\\workspace\\package\\test\\example.js';
    const filenameId = plugin.resolveId('\0node-polyfills:filename', importer).id;
    const dirnameId = plugin.resolveId('\0node-polyfills:dirname', importer).id;

    assert.strictEqual(plugin.load(filenameId), 'export default "/test/example.js"');
    assert.strictEqual(plugin.load(dirnameId), 'export default "/test"');
  });

  it('injects distinct paths with deterministic virtual module IDs', async function() {
    const plugin = nodePolyfills({ baseDir: projectRoot, include: null });
    const importer = path.join(projectRoot, 'test/examples/compat-filename.js');
    const firstFilenameId = plugin.resolveId('\0node-polyfills:filename', importer).id;
    const secondFilenameId = plugin.resolveId('\0node-polyfills:filename', importer).id;
    const dirnameId = plugin.resolveId('\0node-polyfills:dirname', importer).id;
    const first = await bundleFixture('compat-filename.js', { baseDir: projectRoot });
    const second = await bundleFixture('compat-filename.js', { baseDir: projectRoot });
    const result = runCommonJs(first.code).injectedPaths;

    assert.strictEqual(firstFilenameId, secondFilenameId);
    assert.notStrictEqual(firstFilenameId, dirnameId);
    assert.strictEqual(result.dirname, '/test/examples');
    assert.strictEqual(result.filename, '/test/examples/compat-filename.js');
    assert.notStrictEqual(result.dirname, result.filename);
    assert.strictEqual(first.code, second.code);
    assert.deepStrictEqual(first.warnings, []);
    assert.deepStrictEqual(second.warnings, []);
  });

  it('matches Node urlToHttpOptions URL request semantics without input mutation', async function() {
    const generated = await bundleFixture('compat-url-http-options.js');
    const result = runCommonJs(generated.code).urlCompatibility;

    assert.strictEqual(result.protocol, 'https:');
    assert.strictEqual(result.hostname, '2001:db8::1');
    assert.strictEqual(result.port, 8443);
    assert.strictEqual(result.pathname, '/a%20b');
    assert.strictEqual(result.search, '?q=1');
    assert.strictEqual(result.path, '/a%20b?q=1');
    assert.strictEqual(result.hash, '#frag');
    assert.strictEqual(result.auth, 'user name:p@ss');
    assert.strictEqual(
      result.href,
      'https://user%20name:p%40ss@[2001:db8::1]:8443/a%20b?q=1#frag'
    );
    assert.strictEqual(result.copiedExtension, true);
    assert.strictEqual(result.nullPrototype, true);
    assert.strictEqual(result.inputUnchanged, true);
    assert.strictEqual(result.defaultContract, true);
    assert.deepStrictEqual(generated.warnings, []);
  });

  it('provides the bounded util.types and formatWithOptions contracts', async function() {
    const generated = await bundleFixture('compat-util.js');
    const result = runCommonJs(generated.code).utilCompatibility;
    const nativeOptions = { depth: 0, colors: false };

    assert.strictEqual(
      result.formattedObject,
      nativeUtil.formatWithOptions(nativeOptions, 'value: %O', { nested: { value: 1 } })
    );
    assert.strictEqual(
      result.formattedSequence,
      nativeUtil.formatWithOptions(nativeOptions, { nested: { value: 1 } }, 'tail', 2)
    );
    assert.strictEqual(
      result.formattedTokens,
      nativeUtil.formatWithOptions({}, 'tokens: %s %d %j %%', 'value', '2', { ok: true })
    );
    assert.deepStrictEqual(JSON.parse(JSON.stringify(result.typeChecks)), {
      datePositive: nativeUtil.types.isDate(new Date(0)),
      dateNegative: nativeUtil.types.isDate({}),
      mapPositive: nativeUtil.types.isMap(new Map()),
      mapNegative: nativeUtil.types.isMap(new Set()),
      mapSpoofNegative: nativeUtil.types.isMap({ [Symbol.toStringTag]: 'Map' }),
      errorPositive: nativeUtil.types.isNativeError(new TypeError('expected')),
      errorNegative: nativeUtil.types.isNativeError({ name: 'Error' }),
      regexpPositive: nativeUtil.types.isRegExp(/expected/),
      regexpNegative: nativeUtil.types.isRegExp('expected')
    });
    assert.strictEqual(result.subpathNamedContract, true);
    assert.strictEqual(result.subpathDefaultContract, true);
    assert.strictEqual(result.nodeSubpathContract, true);
    assert.strictEqual(result.utilDefaultContract, true);
    assert.strictEqual(result.inspectOptionsUnchanged, true);
    assert.deepStrictEqual(generated.warnings, []);
  });

  const unsupportedImports = {
    named: moduleName => 'import { ' + (moduleName === 'fs' ? 'readFile' : 'randomBytes') +
      ' } from SPECIFIER; export const value = ' +
      (moduleName === 'fs' ? 'readFile' : 'randomBytes') + ';',
    default: () => 'import value from SPECIFIER; export default value;',
    namespace: () => 'import * as value from SPECIFIER; export { value };',
    'side-effect': () => 'import SPECIFIER; export const loaded = true;'
  };

  ['fs', 'crypto'].forEach(moduleName => {
    [moduleName, 'node:' + moduleName].forEach(specifier => {
      Object.keys(unsupportedImports).forEach(importKind => {
        it('fails ' + importKind + ' imports from ' + specifier + ' explicitly', async function() {
          const statement = unsupportedImports[importKind](moduleName)
            .replace(/SPECIFIER/g, JSON.stringify(specifier));
          const filename = importKind === 'named' && specifier.startsWith('node:')
            ? 'compat-unsupported-' + moduleName + '.js'
            : undefined;
          await expectUnsupportedBuiltin(statement, moduleName, filename);
        });
      });
    });
  });

  it('allows unsupported built-ins to be deliberately marked external', async function() {
    for (const specifier of ['fs', 'node:fs', 'crypto', 'node:crypto']) {
      const input = '\0external-builtin-entry';
      const bundle = await rollup.rollup({
        input,
        external: [specifier],
        plugins: [{
          name: 'external-builtin-entry',
          resolveId(importee) {
            return importee === input ? input : null;
          },
          load(id) {
            return id === input ? 'import ' + JSON.stringify(specifier) + ';' : null;
          }
        }, nodePolyfills({ include: null })]
      });

      try {
        const generated = await bundle.generate({ format: 'cjs' });
        const code = generated.output[0].code;
        assert.ok(
          code.includes("require('" + specifier + "')") ||
          code.includes('require("' + specifier + '")')
        );
      } finally {
        await bundle.close();
      }
    }
  });

  it('preserves crypto: true as the legacy empty-shim opt-in', async function() {
    const generated = await bundleFixture('compat-legacy-crypto.js', { crypto: true });
    const result = runCommonJs(generated.code).legacyCrypto;

    assert.deepStrictEqual(Object.keys(result), []);
    assert.deepStrictEqual(generated.warnings, []);
    await expectMissingExport(
      'compat-unsupported-crypto.js',
      'randomBytes',
      'crypto',
      { crypto: true }
    );
  });
});
