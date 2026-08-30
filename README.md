# `@stackline/rollup-plugin-polyfill-node`

Compatibility-focused Rollup polyfills for a documented subset of Node.js
built-in modules in browser bundles.

This package is an independent, Stackline-maintained derivative of
[`rollup-plugin-polyfill-node`](https://github.com/FredKSchott/rollup-plugin-polyfill-node),
which in turn derives from
[`ionic-team/rollup-plugin-node-polyfills`](https://github.com/ionic-team/rollup-plugin-node-polyfills).
It is not affiliated with or endorsed by Fred K. Schott, Ionic, Rollup,
Node.js, or the OpenJS Foundation. Their names identify upstream projects
only. See [NOTICE](NOTICE), [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md),
and [LICENSE.md](LICENSE.md) for provenance and license information.

## Why this derivative exists

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
[support matrix](SUPPORT_MATRIX.md) before relying on a module or export.

## Install

```bash
npm install --save-dev @stackline/rollup-plugin-polyfill-node
```

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
[MIGRATION.md](MIGRATION.md) and remove that workaround only after comparing
the resulting bundle and browser tests.

## Options

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

## Supported surface

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
legacy empty placeholders, is in [SUPPORT_MATRIX.md](SUPPORT_MATRIX.md).

## Migration from the historical package

You can change imports to the scoped package or keep the historical dependency
key with an npm alias:

```json
{
  "devDependencies": {
    "rollup-plugin-polyfill-node": "npm:@stackline/rollup-plugin-polyfill-node@^1.0.0"
  }
}
```

The alias form lets existing `import nodePolyfills from
'rollup-plugin-polyfill-node'` statements remain unchanged while the lockfile
resolves the maintained scoped artifact. Exact commands, behavioral changes,
and rollback guidance are in [MIGRATION.md](MIGRATION.md).

## Security and contributions

Report suspected vulnerabilities privately as described in
[SECURITY.md](SECURITY.md). For build, test, provenance, and compatibility
requirements, see [CONTRIBUTING.md](CONTRIBUTING.md).

## License

The plugin source is MIT licensed. Vendored polyfills retain their original
notices and, where applicable, additional license terms. Distributing a bundle
produced with this plugin may copy polyfill code into that bundle; downstream
distributors are responsible for retaining the applicable notices.
