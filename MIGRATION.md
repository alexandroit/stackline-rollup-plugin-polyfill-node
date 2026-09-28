# Migration guide

This guide migrates `rollup-plugin-polyfill-node@0.13.0` consumers to
`@stackline/rollup-plugin-polyfill-node@1`.

The Stackline package is an independent derivative, not an official successor
published by Fred K. Schott, Ionic, Rollup, or Node.js.

## Choose a dependency-key strategy

### Change source imports to the scoped name

```bash
npm remove rollup-plugin-polyfill-node
npm install --save-dev @stackline/rollup-plugin-polyfill-node@^1.0.1
```

```diff
- import nodePolyfills from 'rollup-plugin-polyfill-node';
+ import nodePolyfills from '@stackline/rollup-plugin-polyfill-node';
```

This is the clearest option for applications that control their Rollup
configuration.

### Preserve the historical dependency key with an npm alias

Use this exact command when source code or shared configuration must continue
to import `rollup-plugin-polyfill-node`:

```bash
npm install --save-dev "rollup-plugin-polyfill-node@npm:@stackline/rollup-plugin-polyfill-node@^1.0.1"
```

It produces this dependency declaration:

```json
{
  "devDependencies": {
    "rollup-plugin-polyfill-node": "npm:@stackline/rollup-plugin-polyfill-node@^1.0.1"
  }
}
```

Keep the historical import unchanged:

```js
import nodePolyfills from 'rollup-plugin-polyfill-node';
```

Commit the changed manifest and lockfile together. The lockfile must resolve
the historical key to the scoped Stackline package and must not retain an
independent `rollup-plugin-polyfill-node@0.13.0` node.

```bash
npm ls rollup-plugin-polyfill-node @stackline/rollup-plugin-polyfill-node
node -p "require('./node_modules/rollup-plugin-polyfill-node/package.json').name"
```

The second command should print `@stackline/rollup-plugin-polyfill-node`.

## Remove `node:` alias workarounds carefully

The historical package did not resolve imports such as `node:path`. Some
projects added a Rollup alias that strips the prefix globally:

```js
alias({
  entries: [{ find: /^node:/, replacement: '' }]
})
```

Version 1 resolves the `node:` spelling for its supported built-ins. After the
package migration:

1. build once with the existing alias and record warnings and bundle hashes;
2. remove only the `node:`-stripping alias entry;
3. rebuild and run the browser/runtime suite;
4. inspect the bundle for unresolved `node:` imports; and
5. retain unrelated alias entries.

Do not strip `node:` indiscriminately. Unsupported server-only modules must
remain visible as compatibility errors rather than being redirected to a
different package accidentally.

## Review behavior changes

- Supported bare and `node:` imports now share one implementation.
- `url` exports `urlToHttpOptions`.
- `util` exports bounded `types` and `formatWithOptions`; `util/types` exports
  `isDate`, `isMap`, `isNativeError`, and `isRegExp`.
- `fs` and default `crypto` now fail in the resolver for every import form
  instead of silently accepting an empty module.
- `__filename` is a filename and no longer duplicates `__dirname`.
- Constants are frozen cross-platform compatibility data, so a build on Linux
  no longer rewrites values published from macOS or Windows.
- Node.js 14 is the minimum runtime for running the plugin.
- Rollup 1 support begins at 1.20.0; Rollup 1 through 4 are peer ranges, not
  bundled copies.

Search the application and transitive bundle graph before upgrading:

```bash
rg "(?:node:)?(?:fs|crypto|http2|dns|dgram|child_process|cluster|module|net|readline|repl|tls|perf_hooks)" src test rollup.config.*
```

Replace unsupported imports with an application-specific browser API. Do not
paper over the error with an empty alias.

If a short transition requires the historical empty `crypto` module, opt in
explicitly:

```js
nodePolyfills({ crypto: true })
```

This does not restore crypto-browserify and does not provide `randomBytes`,
hashes, ciphers, or any other named export. Named imports still fail with
Rollup `MISSING_EXPORT`. Remove the option after replacing the dependency with
a reviewed Web Crypto integration or another explicit browser implementation.

Alternatively, mark `fs` or `crypto` external only when another build stage or
the deployment runtime deliberately supplies that exact module. An external
Node import left in an ordinary browser bundle will fail at runtime.

## Verification checklist

- Install from the exact packed or published artifact, not a source checkout.
- Run Rollup with warnings treated as failures.
- Check CommonJS and ESM output if both are published by the application.
- Exercise `node:` imports, URL conversion, and any `util` predicates used.
- Run the browser integration suite, not only a Node execution of the bundle.
- Confirm the lockfile contains one intended implementation.
- Preserve [NOTICE](NOTICE), [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md),
  and relevant vendored notices in downstream redistributions.

## Rollback

Revert the manifest and lockfile in one change. If the historical dependency
key was preserved with an npm alias, restoring the prior range is sufficient:

```json
{
  "devDependencies": {
    "rollup-plugin-polyfill-node": "^0.13.0"
  }
}
```

Rollback also restores the historical empty-shim and unresolved-`node:`
behavior. It should be a temporary compatibility measure, not a way to hide an
unsupported server-only import.
