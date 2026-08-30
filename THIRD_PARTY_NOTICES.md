# Third-party notices

`@stackline/rollup-plugin-polyfill-node` embeds browser polyfill source into
generated Rollup modules. The resulting application bundle can therefore
contain third-party code even though the package has only one direct installed
production dependency.

This inventory supplements, and does not replace, the complete license texts
and source headers. Machine-readable provenance is in
[`VENDORED_COMPONENTS.json`](VENDORED_COMPONENTS.json) and the release SBOM.

## Source baseline

### `rollup-plugin-polyfill-node@0.13.0`

- Source: <https://github.com/FredKSchott/rollup-plugin-polyfill-node>
- Baseline commit: `31face71b94b8408a907f04753318dff589adc2f`
- Copyright: 2020 Fred K. Schott
- License: MIT
- License text: [`LICENSE.md`](LICENSE.md)

### `ionic-team/rollup-plugin-node-polyfills`

- Source: <https://github.com/ionic-team/rollup-plugin-node-polyfills>
- Shared history through commit:
  `9b5fe1a9cafffd4871e6d65613ed224f807ea251`
- Copyright: 2019 these people
- License: MIT
- License text: second notice in [`LICENSE.md`](LICENSE.md)

The selected fork begins at
`1ee175cf139705f2c5f19775b42fa659c0594fb3`. Stackline modifications are
identified by repository history and the release component inventory.

## Runtime-mapped vendored components

| Component | Version / origin | License | Notice location |
| --- | --- | --- | --- |
| buffer-es6 | 4.9.3, Calvin Metcalf/Feross Aboukhadijeh contributors | MIT and embedded BSD-3-Clause ieee754 notice | [`polyfills/LICENSE-buffer-es6.txt`](polyfills/LICENSE-buffer-es6.txt) |
| process-es6 | 0.11.6, Roman Shtylman and contributors | MIT | [`polyfills/LICENSE-process-es6.txt`](polyfills/LICENSE-process-es6.txt) |
| Node.js browser shim corpus | Node.js/Joyent and other contributors | MIT | Copyright/license headers retained inside source files and generated polyfill strings |
| pako zlib implementation | pako, Vitaly Puzrin and contributors | MIT | [`polyfills/__zlib-lib/LICENSE`](polyfills/__zlib-lib/LICENSE) |

The Node-derived `urlToHttpOptions` implementation retains the Node.js MIT
header in `polyfills/url.js`; that header is carried into generated polyfill
artifacts. The same rule applies to other Node-derived files in the corpus.

## Historical inventories not mapped at runtime

The upstream tree contained browserify-fs and crypto-browserify source
inventories. This derivative does not generate, ship, or map those
implementations as runtime modules. `fs` and `crypto` are explicitly
unsupported by default rather than stale compatibility shims. The optional
`crypto: true` migration mode maps only the historical empty module; it does
not activate any crypto-browserify source.

In short, browserify-fs and crypto-browserify are not shipped as runtime implementations.

Their inventory files remain in the release artifact to make the selected
source lineage auditable:

- [`polyfills/LICENSE-browserify-fs.txt`](polyfills/LICENSE-browserify-fs.txt);
- [`polyfills/LICENSE-crypto-browserify.txt`](polyfills/LICENSE-crypto-browserify.txt).

Retention of those inventories is not a claim that the listed packages execute
in a consumer bundle. `VENDORED_COMPONENTS.json` marks them
`notice-only-not-runtime-mapped`.

## Installed production dependency

The plugin depends on `@rollup/plugin-inject@5.0.5`, distributed under MIT.
Its transitive production closure and exact repository/maintenance review are
recorded in the release SBOM and generated production-closure evidence. Rollup
is a peer dependency and is supplied by the consumer.

## Downstream obligations

When a generated application bundle contains these polyfills, preserve all
applicable copyright and license notices in the distribution. Do not imply
endorsement by an upstream author or organization. Consult counsel for the
obligations of the application's complete dependency graph; this inventory is
not legal advice.

Release automation rejects an artifact that omits the required notice files or
whose SBOM and vendored inventory disagree with the packed bytes.
