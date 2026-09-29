# Changelog

## 1.0.2 - 2026-09-28

- Pin verified Stackline maintenance forks under the existing dependency import names; see `DEPENDENCY_UPDATES.md`.
- Preserve the package API, supported runtimes, upstream comparison tests, and original licenses.

## [1.0.1] - 2026-09-28

- Escape every fragment delimiter in formatted URL queries and preserve authentication colons consistently with Node.js.
- Encode scoped package names correctly in the generated dependency SBOM.
- Organize package documentation, preserve API and migration examples, and add Stackline community links.
- Improve package discovery keywords with precise domain terms and `stackline`.
- Pin GitHub Actions release tooling and require an explicit missing-version response before publication.


All notable changes to `@stackline/rollup-plugin-polyfill-node` are documented
here. This project follows semantic versioning for its documented browser and
Rollup compatibility contract.

## 1.0.0 - 2026-08-30

Initial Stackline-maintained derivative of
`rollup-plugin-polyfill-node@0.13.0` at upstream commit
`31face71b94b8408a907f04753318dff589adc2f`.

### Added

- Resolution parity for supported bare and `node:` built-in specifiers.
- `url.urlToHttpOptions`, including IPv6, numeric port, request path, href, and
  decoded-auth behavior.
- Bounded `util.types`, `util/types`, and `util.formatWithOptions` browser
  contracts.
- Explicit support, compatibility, migration, security, provenance, and
  adoption documentation.
- Packed CommonJS/ESM consumer verification across Rollup 1, 2, 3, and 4 and
  supported Node.js families.
- Production dependency closure, SBOM, package lint, license, source audit,
  CodeQL, and deterministic-build gates.

### Changed

- Package identity is `@stackline/rollup-plugin-polyfill-node`; an exact npm
  alias migration is documented for consumers retaining the historical key.
- Node.js 14 or newer is required to run the plugin.
- The Rollup peer range is explicit: `^1.20.0 || ^2 || ^3 || ^4`.
- Build-time constants are frozen reviewed input instead of host-derived data.
- `fs` and default `crypto` produce an actionable
  `UNSUPPORTED_NODE_BUILTIN` resolver error for every import form. Strict
  `crypto: true` preserves the incomplete historical empty-shim path for
  controlled migrations.
- Generated artifacts include the complete vendored license inventory and
  machine-readable component/SBOM records.

### Fixed

- `node:path` and other supported `node:` imports no longer remain unresolved
  externals.
- `__filename` no longer receives the `__dirname` value.
- Missing named exports for `urlToHttpOptions`, bounded `util.types`, and
  `formatWithOptions` are implemented and tested.

### Attribution

- Preserves Fred K. Schott's 2020 MIT notice and the Ionic-origin 2019 MIT
  notice.
- Retains file-level Node.js, buffer-es6, process-es6, pako, and other vendored
  component notices. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
