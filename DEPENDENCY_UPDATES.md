# Dependency maintenance for @stackline/rollup-plugin-polyfill-node 1.0.2

Reviewed 2026-09-28. Direct dependency aliases retain the original import names and pin the verified Stackline maintenance releases. The public API and declared runtime compatibility remain unchanged.

| Import / install key | Previous requirement | Maintained requirement | Verified release |
| --- | --- | --- | --- |
| `@rollup/plugin-inject` | `5.0.5` | `npm:@stackline/rollup-plugin-inject@1.0.0` | [@stackline/rollup-plugin-inject](https://github.com/alexandroit/stackline-rollup-plugin-inject/releases/tag/stackline-v1.0.0) |

Each linked release was published through GitHub Actions and checked against its exact CI tarball, npm provenance and signatures, direct/aliased installations, and immutable release assets before adoption. Original upstream attribution and license texts remain in the dependency packages. Test-only upstream comparison packages remain independent oracles. Only the original parent projects’ direct/runtime/dev dependencies are in this audit scope; transitive dependencies are not recursively forked.
