# @stackline/rollup-plugin-polyfill-node

> Compatibility-first Rollup polyfills for supported Node.js built-ins in browsers

[![npm version](https://img.shields.io/npm/v/@stackline/rollup-plugin-polyfill-node.svg?style=flat-square)](https://www.npmjs.com/package/@stackline/rollup-plugin-polyfill-node)
[![license](https://img.shields.io/npm/l/@stackline/rollup-plugin-polyfill-node.svg?style=flat-square)](https://github.com/alexandroit/stackline-rollup-plugin-polyfill-node/blob/main/LICENSE.md)
[![GitHub repository](https://img.shields.io/badge/GitHub-Repository-181717?style=flat-square&logo=github)](https://github.com/alexandroit/stackline-rollup-plugin-polyfill-node)

**[Documentation](https://alexandro.net/docs/vanilla/rollup-plugin-polyfill-node/)** |
**[npm](https://www.npmjs.com/package/@stackline/rollup-plugin-polyfill-node)** |
**[Issues](https://github.com/alexandroit/stackline-rollup-plugin-polyfill-node/issues)** |
**[Repository](https://github.com/alexandroit/stackline-rollup-plugin-polyfill-node)**

**Package version:** `1.0.2`

## Why this package?

Compatibility-focused Rollup polyfills for a documented subset of Node.js
built-in modules in browser bundles.

This package is an independent, Stackline-maintained derivative of
[`rollup-plugin-polyfill-node`](https://github.com/FredKSchott/rollup-plugin-polyfill-node),
which in turn derives from
[`ionic-team/rollup-plugin-node-polyfills`](https://github.com/ionic-team/rollup-plugin-node-polyfills).
It is not affiliated with or endorsed by Fred K. Schott, Ionic, Rollup,
Node.js, or the OpenJS Foundation. Their names identify upstream projects
only. See [NOTICE](https://github.com/alexandroit/stackline-rollup-plugin-polyfill-node/blob/main/NOTICE), [THIRD_PARTY_NOTICES.md](https://github.com/alexandroit/stackline-rollup-plugin-polyfill-node/blob/main/THIRD_PARTY_NOTICES.md),
and [LICENSE.md](https://github.com/alexandroit/stackline-rollup-plugin-polyfill-node/blob/main/LICENSE.md) for provenance and license information.

<a id="why-this-derivative-exists"></a>

### Why this derivative exists

The historical `0.13.0` package has useful, widely deployed browser
polyfills, but it does not resolve supported `node:` imports and several
documented Node exports are absent. This derivative keeps the proven Rollup
plugin contract while making its boundary explicit:

- bare and `node:`-prefixed imports resolve identically for supported
  built-ins;
- `url.urlToHttpOptions`, a bounded `util.types`, and
  `util.formatWithOptions` are available as named exports;
- `fs` and, by default, `crypto` fail during resolution instead of becoming
  silent empty modules;
- `__filename` and `__dirname` are injected as distinct POSIX-style values;
- the constants corpus is frozen, reviewed input rather than a snapshot of the
  machine that happened to build the package; and
- CommonJS and ESM plugin entry points are shipped and tested from the packed
  artifact.

This is a browser compatibility layer, not a Node.js runtime. Review the
[support matrix](https://github.com/alexandroit/stackline-rollup-plugin-polyfill-node/blob/main/SUPPORT_MATRIX.md) before relying on a module or export.

## Compatibility

| Item | Value |
| --- | --- |
| Package | `@stackline/rollup-plugin-polyfill-node@1.0.2` |
| Node.js runtime | `>=14.0.0` |
| CommonJS / primary entry | `./dist/index.js` |
| ES module entry | `./dist/es/index.js` |
| Type declarations | `./dist/index.d.cts` |

## Installation

<a id="install"></a>

### Install

```bash
npm install --save-dev @stackline/rollup-plugin-polyfill-node
```

## Usage

The package supports Node.js 14 or newer and Rollup `^1.20.0`, `^2`, `^3`, or
`^4`.

```js
import nodePolyfills from '@stackline/rollup-plugin-polyfill-node';

export default {
  input: 'src/index.js',
  output: {
    file: 'dist/bundle.js',
    format: 'es'
  },
  plugins: [nodePolyfills()]
};
```

CommonJS configuration is also supported:

```js
const loaded = require('@stackline/rollup-plugin-polyfill-node');
const nodePolyfills = loaded.default || loaded;

module.exports = {
  input: 'src/index.js',
  plugins: [nodePolyfills()]
};
```

Place this plugin before plugins that need to consume the resolved polyfill
modules. If an alias plugin currently strips `node:`, follow
[MIGRATION.md](https://github.com/alexandroit/stackline-rollup-plugin-polyfill-node/blob/main/MIGRATION.md) and remove that workaround only after comparing
the resulting bundle and browser tests.

## Features and Integrations

<a id="supported-surface"></a>

### Supported surface

The main supported module families are `assert`, `buffer`, `constants`,
`events`, `http`, `https`, `os`, `path`, `process`, `punycode`, `querystring`,
`stream`, `string_decoder`, `timers`, `tty`, `url`, `util`, `vm`, and `zlib`.
Several have browser-specific caveats. `util/types` is deliberately limited to
`isDate`, `isMap`, `isNativeError`, and `isRegExp`.

Server-only modules such as `fs`, `crypto`, `child_process`, `net`, and `tls`
are unsupported. `fs` and default `crypto` imports fail with
`UNSUPPORTED_NODE_BUILTIN` for bare and `node:` spellings, including namespace
and side-effect imports. Provide an explicit browser implementation or mark the
module external only when the target runtime supplies it. This package does not
pretend that browser storage is Node's filesystem, and it does not ship the
historical crypto-browserify snapshot. The complete classification, including
legacy empty placeholders, is in [SUPPORT_MATRIX.md](https://github.com/alexandroit/stackline-rollup-plugin-polyfill-node/blob/main/SUPPORT_MATRIX.md).

<a id="migration-from-the-historical-package"></a>

### Migration from the historical package

You can change imports to the scoped package or keep the historical dependency
key with an npm alias:

```json
{
  "devDependencies": {
    "rollup-plugin-polyfill-node": "npm:@stackline/rollup-plugin-polyfill-node@^1.0.2"
  }
}
```

The alias form lets existing `import nodePolyfills from
'rollup-plugin-polyfill-node'` statements remain unchanged while the lockfile
resolves the maintained scoped artifact. Exact commands, behavioral changes,
and rollback guidance are in [MIGRATION.md](https://github.com/alexandroit/stackline-rollup-plugin-polyfill-node/blob/main/MIGRATION.md).

## Security

<a id="security-and-contributions"></a>

### Security and contributions

Report suspected vulnerabilities privately as described in
[SECURITY.md](https://github.com/alexandroit/stackline-rollup-plugin-polyfill-node/blob/main/SECURITY.md). For build, test, provenance, and compatibility
requirements, see [CONTRIBUTING.md](https://github.com/alexandroit/stackline-rollup-plugin-polyfill-node/blob/main/CONTRIBUTING.md).

## API Surface

<a id="options"></a>

### Options

All options are optional.

```ts
interface NodePolyfillsOptions {
  baseDir?: string;
  crypto?: boolean;
  sourceMap?: boolean;
  include?: Array<string | RegExp> | string | RegExp | null;
  exclude?: Array<string | RegExp> | string | RegExp | null;
}
```

- `baseDir` controls the base used for injected `__dirname` and `__filename`
  values. It defaults to `/`.
- `crypto` defaults to `false`. Strict `true` restores the historical empty
  `crypto` shim for migration only; it does not implement any crypto export.
- `include` controls global injection by `@rollup/plugin-inject`. The default
  is `node_modules/**/*.js`. Pass `null` to include application source too.
- `exclude` removes matching files from global injection.
- `sourceMap` enables or disables source maps produced by the injection pass.

The `include` and `exclude` options affect injected globals such as `Buffer`
and `process`; they do not turn unsupported Node built-ins into supported
ones.

## Local Development

```sh
git clone https://github.com/alexandroit/stackline-rollup-plugin-polyfill-node.git
cd stackline-rollup-plugin-polyfill-node
npm ci
npm run verify
```

Release tooling uses Node.js 24.20.0 and npm 11.19.0. The consumer runtime contract remains the one documented above.

## Consumer Smoke Test

Run the repository's existing consumer/package check after installing development dependencies:

```sh
npm run check:packed
```

## Release Checklist

Run `npm run verify` and inspect the package contents before release. Publish a new version through the [GitHub Actions publishing workflow](https://github.com/alexandroit/stackline-rollup-plugin-polyfill-node/actions/workflows/publish.yml), using the SHA-512 digest of the reviewed tarball. Verify the exact published version, tarball integrity, and npm provenance after the run.

## Community and Support

Report reproducible package issues in the [issue tracker](https://github.com/alexandroit/stackline-rollup-plugin-polyfill-node/issues). Use the [security policy](https://github.com/alexandroit/stackline-rollup-plugin-polyfill-node/blob/main/SECURITY.md) for vulnerability reports.

- [Stackline / Alexandro.Net](https://alexandro.net/)
- [GitHub](https://github.com/alexandroit)
- [Maintainer LinkedIn](https://www.linkedin.com/in/aleinfo/)
- [Reddit community: r/Stackline](https://www.reddit.com/r/Stackline/)

## License

The plugin source is MIT licensed. Vendored polyfills retain their original
notices and, where applicable, additional license terms. Distributing a bundle
produced with this plugin may copy polyfill code into that bundle; downstream
distributors are responsible for retaining the applicable notices.

Dependency maintenance for this release is documented in [DEPENDENCY_UPDATES.md](DEPENDENCY_UPDATES.md).
