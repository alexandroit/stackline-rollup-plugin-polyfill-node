# Contributing

Thank you for improving `@stackline/rollup-plugin-polyfill-node`. Contributions
must preserve its bounded browser contract and upstream attribution.

This is an independent derivative. Contributions must not describe it as an
official Fred K. Schott, Ionic, Rollup, Node.js, or OpenJS Foundation package.

## Before opening a pull request

- Use an issue to discuss a new built-in module, a significant compatibility
  expansion, or a breaking behavior change.
- Report suspected vulnerabilities privately through
  [SECURITY.md](SECURITY.md), not in an issue or public pull request.
- Search existing issues and pull requests for the same failure.
- Reduce compatibility reports to one import, one Rollup configuration, and an
  expected browser result when possible.

## Development environment

Node.js 20.20.2 and npm 10.8.2 are the reference local toolchain. CI repeats
source verification on Node.js 22.22.3 and 24.15.0 and consumes the packed
artifact on every supported Node/Rollup lane.

```bash
npm install --global npm@10.8.2
npm ci --ignore-scripts
npm run verify
```

`npm run verify` is the release-shaped local gate: type/lint checks, clean
build, upstream and compatibility tests, reproducibility, package linting,
license inventory, production closure, packed consumers, tarball inventory,
and source/production audits. Do not replace it with a source-only test when
claiming a change is ready.

## Compatibility changes

Every new module or export needs:

1. a minimal fixture for the bare and `node:` spellings;
2. expected-value browser assertions;
3. differential tests against supported Node behavior where that comparison is
   meaningful;
4. Rollup 1, 2, 3, and 4 packed-consumer coverage;
5. an update to [SUPPORT_MATRIX.md](SUPPORT_MATRIX.md) and, for behavioral
   changes, [COMPATIBILITY.md](COMPATIBILITY.md); and
6. provenance and notice updates for copied or derived code.

Do not add a new server-only built-in as an empty module. If honest browser
semantics are unavailable, add an explicit unsupported diagnostic and document
an application-level alternative. Existing legacy placeholders remain
unsupported and must not acquire accidental API claims. Preserve the default
`fs`/`crypto` resolver failure and treat `crypto: true` only as the tested
historical migration path.

`util.types` is allowlisted. Add a predicate only with a reviewed browser
implementation and cross-realm/differential cases. Changes to
`formatWithOptions` must cover every affected token and must not imply support
for Node inspect options the browser implementation ignores.

## Generated and vendored code

- Never regenerate `polyfills/constants.js` from the build host. It is frozen
  compatibility input; changing it requires an explicit contract review and
  cross-platform evidence.
- Keep copyright and license headers in every derived source file.
- Update `VENDORED_COMPONENTS.json`, `THIRD_PARTY_NOTICES.md`, the relevant
  license file, and the SBOM generator whenever provenance changes.
- Remove dead source inventories and their references together; do not delete
  a notice merely because code is generated into a string.
- Verify two clean builds produce byte-identical `dist`, generated polyfill,
  and SBOM files.

## Pull-request checklist

- [ ] The issue and compatibility impact are described.
- [ ] Tests fail without the change and pass with it.
- [ ] Bare and `node:` spellings are covered where applicable.
- [ ] Unsupported behavior remains explicit.
- [ ] Documentation and changelog are updated.
- [ ] Attribution, notices, vendored inventory, and SBOM are accurate.
- [ ] `npm run verify` passes from a clean install.
- [ ] No generated tarball, coverage output, credential, or local cache is
      committed.

Keep changes focused. Maintainers may ask to separate refactoring from a
compatibility fix so provenance and behavior remain reviewable.
