# Compatibility contract

This document defines the supported toolchain and the behavioral differences
that matter when adopting `@stackline/rollup-plugin-polyfill-node`. Module-level
coverage is recorded in [SUPPORT_MATRIX.md](SUPPORT_MATRIX.md).

## Toolchain

| Surface | Supported range | Release verification |
| --- | --- | --- |
| Node.js running Rollup | `>=14.0.0` | Packed consumers cover the Node 14, 16, 18, 20, 22, and 24 families. |
| Rollup | `^1.20.0 \|\| ^2.0.0 \|\| ^3.0.0 \|\| ^4.0.0` | Packed consumers exercise Rollup 1.32.1, 2.79.2, 3.29.5, and the pinned Rollup 4 release. |
| Package loading | CommonJS and ESM | Both entry points are checked from the packed tarball. |
| TypeScript declarations | TypeScript 3.9-compatible baseline and current TypeScript | Legacy and current declaration consumers are compiled independently. |
| Build hosts | Linux, macOS, and Windows | Linux runs the complete release gate; macOS and Windows repeat clean builds and reproducibility checks. |

The exact source-verification Node versions are 20.20.2, 22.22.3, and 24.15.0.
Older supported Node versions consume the already-built tarball; they are not
required to run the modern development toolchain.

## Bare and `node:` specifiers

Every supported top-level built-in has one implementation. The plugin
normalizes its valid `node:` spelling before lookup, so these imports have the
same bundle behavior:

```js
import { join as bareJoin } from 'path';
import { join as prefixedJoin } from 'node:path';
```

The same rule covers the supported `util/types` subpath and
`node:util/types`. The plugin does not strip `node:` from arbitrary strings.
Non-built-in package specifiers remain available to normal Rollup resolution.

`fs`, `node:fs`, `crypto`, and `node:crypto` fail in `resolveId` by default for
named, default, namespace, and side-effect imports. Rollup reports plugin code
`UNSUPPORTED_NODE_BUILTIN` and tells the consumer to provide a browser
implementation or mark the import as external. `crypto: true` is a narrowly
preserved migration option that selects the historical empty crypto shim;
named crypto exports remain unavailable. Other unsupported modules retain
their documented legacy no-export placeholders where listed in the support
matrix.

## URL compatibility

`urlToHttpOptions` is exported from both `url` and `node:url`. It projects a
WHATWG `URL` into the public request-options fields used by Node:

- `protocol`, `hostname`, `hash`, `search`, `pathname`, `path`, and `href`;
- a numeric `port` when the URL contains a port;
- brackets removed from an IPv6 hostname; and
- percent-decoded `username:password` in `auth` when credentials are present.

The browser must provide `globalThis.URL` and `URLSearchParams`. The polyfill
does not reproduce private Node URL slots or undocumented properties.

## `util` compatibility

`formatWithOptions(inspectOptions, ...values)` requires an options object and
supports `%s`, `%d`, `%i`, `%f`, `%j`, `%o`, `%O`, `%c`, and `%%`. `%c`
consumes its CSS argument and emits no text, matching non-styled terminal
output. Object rendering uses this package's bounded browser `inspect`
implementation, so every Node `inspect` option is not promised.

The `types` object and `util/types` subpath expose only:

- `isDate`;
- `isMap`;
- `isNativeError`; and
- `isRegExp`.

Unsupported `util.types` predicates are intentionally absent. New predicates
require browser semantics and differential tests before they can be added.

## Constants and reproducibility

`polyfills/constants.js` is reviewed, frozen compatibility input with SHA-256
`ba2bff6ccb95b773a7ab6460e633a64ff299796025c1e4317ee8f95a22109b6a`.
Builds never call the host's `require('constants')`. Consequently a Linux,
macOS, or Windows builder cannot silently replace the published errno, signal,
TLS, or crypto constant values with its local Node/OS snapshot.

These values are a stable browser compatibility contract. They are not a
promise to track the host operating system on which a consumer runs Rollup.

## Injected globals

The plugin can inject `process`, `Buffer`, `global`, `__dirname`, and
`__filename`. Paths use POSIX separators because they describe bundled module
identifiers, not the build host's filesystem. `__filename` contains the
relative module filename; it is not an alias of `__dirname`.

By default global injection examines `node_modules/**/*.js`. Set `include` to
`null` when application source also needs injection.

## Browser-specific boundaries

- `http` and `https` share one browser transport implementation and depend on
  browser fetch or XHR capabilities; they do not expose Node sockets.
- `vm` is a browser approximation and does not reproduce every Node context or
  worker corner case.
- Streams and modules built on streams contain cycles and are less
  tree-shakeable than `path`, `querystring`, `events`, or individual `util`
  exports.
- `console` is a thin browser-global facade.
- `fs` and default `crypto` are rejected rather than silently mocked. Other
  server-only built-ins have no supported API; see the exact legacy-placeholder
  behavior in the unsupported table before migrating.

## Release evidence

A release is valid only when clean source verification, packed consumer tests,
production-closure audit, license inventory, SBOM, package linting, and
reproducibility checks all pass. A successful source-tree unit test alone is
not release evidence.
