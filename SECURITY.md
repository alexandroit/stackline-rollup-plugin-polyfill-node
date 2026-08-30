# Security policy

## Supported versions

| Version | Security updates |
| --- | --- |
| 1.x | Supported |
| 0.x and `rollup-plugin-polyfill-node` releases | Not maintained by this project |

The historical unscoped package is controlled by its own maintainers. This
project cannot issue, withdraw, or patch releases under that name.

## Report a vulnerability privately

Do not open a public issue for a suspected vulnerability. Use the repository's
private security-advisory form:

<https://github.com/alexandroit/stackline-rollup-plugin-polyfill-node/security/advisories/new>

Include:

- the affected package version and integrity or tarball hash;
- the Rollup and Node.js versions used to reproduce it;
- whether the problem occurs while building, in the generated browser bundle,
  or in release tooling;
- a minimal input and configuration;
- impact, prerequisites, and any known workaround; and
- whether disclosure is already public or subject to a deadline.

Do not include credentials, production data, or an exploit against systems you
do not own. Maintainers aim to acknowledge a complete report within three
business days and provide an initial assessment within seven business days.
These are response goals, not a guarantee of resolution time.

## Security scope

In scope are vulnerabilities in:

- plugin resolution, loading, or transform behavior;
- generated browser polyfills and injected globals;
- package exports, install scripts, and packed-artifact contents;
- deterministic build, provenance, license, or SBOM controls where bypass can
  change released code; and
- the exact installed production dependency closure.

A documented absence of Node server semantics in a browser is not by itself a
security vulnerability. `fs` and default `crypto` are intentionally rejected;
other unsupported modules have the resolver behavior documented in the
[support matrix](SUPPORT_MATRIX.md). A report is in scope if the plugin
silently permits or misrepresents an import contrary to that matrix. The
legacy `crypto: true` empty-module opt-in provides no cryptographic security.

The `vm` polyfill is a compatibility helper, not a sandbox or security
boundary. Never execute untrusted code with it.

## Disclosure and fixes

Maintainers will coordinate validation, affected ranges, credit, embargo, and
release timing with the reporter. A security release must pass the same source,
packed-consumer, production-closure, CodeQL, reproducibility, license, and SBOM
gates as any other release. Public disclosure should follow availability of a
tested fix whenever coordinated disclosure permits.
