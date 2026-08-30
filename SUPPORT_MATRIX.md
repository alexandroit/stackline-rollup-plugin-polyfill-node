# Support matrix

This is the normative module boundary for
`@stackline/rollup-plugin-polyfill-node`. “Supported” means the named browser
contract is tested; it does not mean byte-for-byte equivalence with every
current Node.js implementation.

Both the bare name and the corresponding `node:` name are supported unless a
row says otherwise.

## Runtime and bundler versions

| Component | Supported |
| --- | --- |
| Node.js running the plugin | `>=14.0.0` |
| Rollup | `^1.20.0`, `^2.0.0`, `^3.0.0`, `^4.0.0` |
| Plugin entry | CommonJS and ESM |
| Rollup output exercised | CommonJS and ESM |
| Build hosts | Linux; reproducibility checks on macOS and Windows |

## Supported modules

| Module | Status | Browser contract and caveats |
| --- | --- | --- |
| `assert` | Supported | Browser assertion implementation; no undocumented Node internals. |
| `buffer` | Supported | `Buffer` implementation derived from buffer-es6; see its bundled MIT and BSD-3-Clause notices. |
| `constants` | Supported, frozen | Stable cross-platform corpus; deliberately not regenerated from the build host. |
| `console` | Bounded | Facade over the browser console; prefer the browser global. |
| `domain` | Legacy/bounded | Retained for historical browser dependencies; new code should avoid Node domains. |
| `events` | Supported | EventEmitter-compatible browser implementation. |
| `http` | Bounded | Browser fetch/XHR transport; no Node socket or agent equivalence. |
| `https` | Bounded | Uses the same browser transport as `http`; protocol-specific Node internals are absent. |
| `os` | Bounded | Browser-safe values only; not host OS introspection. |
| `path` | Supported | POSIX browser path implementation. |
| `process` | Supported | Browser process shim; not a real operating-system process. |
| `punycode` | Supported | Vendored JavaScript implementation. |
| `querystring` | Supported | Legacy query-string API. New code may prefer `URLSearchParams`. |
| `stream` | Supported/bounded | Browser stream implementation with limited tree shaking because of internal cycles. |
| `string_decoder` | Supported | JavaScript string decoder used by the stream corpus. |
| `sys` | Alias | Resolves to the supported `util` implementation. |
| `timers` | Supported | Browser timer facade. |
| `tty` | Bounded | Browser-safe TTY facade; no terminal device access. |
| `url` | Supported/bounded | Legacy URL functions, WHATWG globals, `fileURLToPath`, and `urlToHttpOptions`; requires browser `URL`/`URLSearchParams`. |
| `util` | Supported/bounded | Historical helpers plus bounded `formatWithOptions` and `types`; see below. |
| `util/types` | Supported/bounded | Only `isDate`, `isMap`, `isNativeError`, and `isRegExp`; named exports and the default `types` object expose the same predicates. |
| `vm` | Bounded | Browser context approximation; not a security boundary and not full Node VM behavior. |
| `zlib` | Supported/bounded | JavaScript compression implementation derived from pako; no native bindings. |

Internal `_stream_*`, `_inherits`, and `_buffer_list` mappings exist to support
the shipped corpus. They are implementation details, not public compatibility
promises.

## Supported globals

| Global | Contract |
| --- | --- |
| `Buffer` | Injected from the supported `buffer` polyfill. |
| `process` | Injected from the browser process shim. |
| `global` | Resolves to the browser global object. |
| `__dirname` | POSIX-style directory derived from the importing module and `baseDir`. |
| `__filename` | POSIX-style filename derived from the importing module and `baseDir`. |

Global injection defaults to dependency code matching `node_modules/**/*.js`.
Use `include: null` to include application modules.

## `urlToHttpOptions`

The supported projection includes protocol, unbracketed IPv6 hostname, numeric
port, pathname, search, hash, combined request path, href, and decoded auth.
It accepts a WHATWG `URL`. It does not expose Node-private URL slots.

## `util.formatWithOptions`

| Token | Behavior |
| --- | --- |
| `%s` | String conversion |
| `%d` | Number conversion |
| `%i` | Integer parsing |
| `%f` | Floating-point parsing |
| `%j` | JSON serialization; circular input becomes `[Circular]` |
| `%O` | Bounded `inspect` with the supplied options |
| `%o` | Bounded detailed `inspect` (`showHidden`, depth 4) |
| `%c` | Consumes browser-console styling input and emits no text |
| `%%` | Literal percent sign |

The first argument must be an object. This implementation does not claim all
current Node `inspect` formatting, coloring, proxy, getter, or custom-symbol
semantics.

## Unsupported modules

| Module | Resolver behavior | Reason / alternative |
| --- | --- | --- |
| `fs` | Bare and `node:` imports fail with `UNSUPPORTED_NODE_BUILTIN` for every import form. | A browser has no general Node filesystem contract. Choose an explicit storage API, or mark it external only when the target runtime supplies it. |
| `crypto` | Same explicit failure by default. `crypto: true` opts into the historical empty module; named exports still fail with Rollup `MISSING_EXPORT`. | The stale crypto-browserify corpus is not shipped or mapped. Use the Web Crypto API deliberately or provide a reviewed alias. |
| `http2` | Legacy empty no-export placeholder. | No reviewed browser-equivalent Node HTTP/2 session API. |
| `dns`, `dgram`, `net`, `tls` | Legacy empty no-export placeholders. | Require operating-system networking semantics unavailable to ordinary browser code. |
| `child_process`, `cluster` | Legacy empty no-export placeholders. | Require process contracts that this plugin does not emulate. |
| `module`, `repl` | Legacy empty no-export placeholders. | Depend on the Node module loader or interactive runtime. |
| `readline` | Legacy empty no-export placeholder. | Node stream/terminal interaction is not represented by a browser prompt API. |
| `perf_hooks` | Legacy empty no-export placeholder. | No reviewed compatibility mapping is shipped. Use browser Performance APIs directly. |
| Other Node built-ins, including `worker_threads` | No plugin mapping; normal Rollup unresolved/external handling applies. | No documented compatibility implementation. |

Any Node built-in not listed in the supported table is unsupported. Legacy
empty placeholders are retained only where the table says so; they have no
functional API and must not be interpreted as support.

The default `fs`/`crypto` diagnostic is stable:

```text
The Node.js "<name>" builtin is intentionally unsupported in browser bundles. Provide a browser implementation or mark the import as external.
```

Rollup exposes it as `PLUGIN_ERROR` with plugin code
`UNSUPPORTED_NODE_BUILTIN`, plugin `polyfill-node`, and hook `resolveId`. This
also catches side-effect and namespace imports that would otherwise hide an
empty module. `crypto: true` exists only to reproduce the old empty-shim
behavior during a controlled migration; it does not provide `randomBytes` or
any other named API.

## Versioning rule

Adding a module or export requires a browser implementation, expected-value
tests, and Node differential tests. Removing or narrowing a documented
supported surface is a semver-major change. Correcting behavior inside an
already bounded caveat may be released as a fix when it restores the documented
contract.
