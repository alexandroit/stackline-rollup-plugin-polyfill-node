import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

var sourceSiteDir = path.dirname(fileURLToPath(import.meta.url))
var siteDir = process.argv[2] ? path.resolve(process.argv[2]) : path.join(sourceSiteDir, 'dist')
var projectDir = path.resolve(sourceSiteDir, '..')

function read (base, name) {
  var file = path.join(base, name)
  if (!fs.existsSync(file)) throw new Error('Missing documentation file: ' + file)
  var value = fs.readFileSync(file, 'utf8')
  if (!value.trim()) throw new Error('Empty documentation file: ' + file)
  return value
}

function assert (condition, message) {
  if (!condition) throw new Error(message)
}

function includesAll (value, needles, label) {
  needles.forEach(function (needle) {
    assert(value.indexOf(needle) !== -1, label + ' is missing: ' + needle)
  })
}

var siteFiles = [
  'index.html',
  'styles.css',
  'app.js',
  'robots.txt',
  'sitemap.xml',
  'llms.txt',
  'llms-full.txt',
  'package-meta.json'
]

var rootFiles = [
  'README.md',
  'CHANGELOG.md',
  'COMPATIBILITY.md',
  'SUPPORT_MATRIX.md',
  'MIGRATION.md',
  'SECURITY.md',
  'CONTRIBUTING.md',
  'LICENSE.md',
  'NOTICE',
  'THIRD_PARTY_NOTICES.md',
  'VENDORED_COMPONENTS.json',
  'PRODUCTION_DEPENDENCY_REVIEW.json',
  'package.json'
]

var site = {}
siteFiles.forEach(function (name) { site[name] = read(siteDir, name) })

var docs = {}
rootFiles.forEach(function (name) {
  docs[name] = read(projectDir, name)
  assert(read(siteDir, name) === docs[name], 'prepared documentation is stale: ' + name)
})

var html = site['index.html']
var visibleHtml = html.replace(/<!--\/?email_off-->/g, '')
var css = site['styles.css']
var app = site['app.js']
var robots = site['robots.txt']
var sitemap = site['sitemap.xml']
var llms = site['llms.txt']
var llmsFull = site['llms-full.txt']
var packageMetadata = JSON.parse(site['package-meta.json'])
var packageJson = JSON.parse(docs['package.json'])
var vendored = JSON.parse(docs['VENDORED_COMPONENTS.json'])
var productionReview = JSON.parse(docs['PRODUCTION_DEPENDENCY_REVIEW.json'])
var canonical = 'https://alexandro.net/docs/vanilla/rollup-plugin-polyfill-node/'
var packageName = '@stackline/rollup-plugin-polyfill-node'

assert(packageMetadata.name === packageName, 'package metadata identity is wrong')
assert(packageMetadata.version === '1.0.0', 'package metadata version is wrong')
assert(packageMetadata.runtimeFloor === 'Node.js 14', 'package metadata runtime floor is wrong')
assert(packageMetadata.moduleFormat === 'CommonJS and ESM', 'package metadata module format is wrong')
assert(packageMetadata.productionDependencies === 1, 'package metadata dependency count is wrong')
assert(packageMetadata.peerRange === 'Rollup ^1.20.0 || ^2.0.0 || ^3.0.0 || ^4.0.0', 'package metadata peer range is wrong')
assert(packageMetadata.upstreamBaseline === 'rollup-plugin-polyfill-node 0.13.0', 'package metadata upstream baseline is wrong')

assert(packageJson.name === packageName, 'package.json identity is wrong')
assert(packageJson.version === '1.0.1', 'package.json version is wrong')
assert(packageJson.engines && packageJson.engines.node === '>=14.0.0', 'package.json Node floor is wrong')
assert(packageJson.peerDependencies && packageJson.peerDependencies.rollup === '^1.20.0 || ^2.0.0 || ^3.0.0 || ^4.0.0', 'package.json Rollup peer range is wrong')
assert(packageJson.dependencies && packageJson.dependencies['@rollup/plugin-inject'] === '5.0.5', 'package.json production dependency is wrong')
assert(Object.keys(packageJson.dependencies).length === 1, 'package.json must have one direct production dependency')
assert(packageJson.homepage === canonical, 'package.json homepage is not canonical')

includesAll(visibleHtml, [
  '<html lang="en">',
  '<link rel="canonical" href="' + canonical + '">',
  'Alexandro.Net',
  'Open Source',
  'href="#content"',
  '<main id="content" tabindex="-1">',
  '<nav class="top-nav" aria-label="Page navigation">',
  '<h1 id="page-title">@stackline/<span>rollup-plugin-polyfill-node</span></h1>',
  '<footer class="site-footer">',
  'aria-live="polite"',
  'role="img"',
  '<caption>',
  'npm install --save-dev @stackline/rollup-plugin-polyfill-node@1.0.0',
  'rollup-plugin-polyfill-node@npm:@stackline/rollup-plugin-polyfill-node@1.0.0',
  'Node.js ≥14',
  'Rollup 1–4',
  'CommonJS + ESM',
  'UNSUPPORTED_NODE_BUILTIN',
  'nodePolyfills({ crypto: true })',
  '@rollup/plugin-inject@5.0.5',
  'not affiliated with or endorsed by'
], 'index.html')

;['nodePolyfills(', 'urlToHttpOptions', 'formatWithOptions', 'isMap', 'UNSUPPORTED_NODE_BUILTIN'].forEach(function (api) {
  assert(visibleHtml.indexOf(api) !== -1, 'index.html is missing contract term: ' + api)
  assert(docs['README.md'].indexOf(api) !== -1, 'README.md is missing contract term: ' + api)
})

assert((html.match(/<h1(?:\s|>)/g) || []).length === 1, 'index.html must contain exactly one h1')
assert(html.length > 17500, 'index.html is unexpectedly thin')
assert(html.indexOf('http://') === -1, 'index.html contains an insecure URL')
assert(html.indexOf('localhost') === -1, 'index.html contains localhost')
assert((html.match(/<!--email_off-->/g) || []).length === 2, 'index.html must protect two package-at-version strings')
assert((html.match(/<!--\/email_off-->/g) || []).length === 2, 'email protection markers must balance')

var jsonLdMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)
assert(jsonLdMatch, 'index.html is missing JSON-LD')
var jsonLd = JSON.parse(jsonLdMatch[1])
assert(jsonLd['@type'] === 'SoftwareSourceCode', 'JSON-LD type is wrong')
assert(jsonLd.name === packageName, 'JSON-LD package identity is wrong')
assert(jsonLd.version === '1.0.0', 'JSON-LD package version is wrong')
assert(jsonLd.url === canonical, 'JSON-LD canonical URL is wrong')
assert(jsonLd.runtimePlatform === 'Node.js >=14; Rollup 1-4', 'JSON-LD runtime platform is wrong')

includesAll(css, [
  ':focus-visible',
  'overflow-wrap: anywhere',
  'max-width: 100%',
  'min-width: 0',
  '@media (max-width:',
  '@media (prefers-reduced-motion: reduce)',
  '@media print'
], 'styles.css')

includesAll(app, ["'use strict'", '[data-copy-target]', 'navigator.clipboard.writeText'], 'app.js')
assert(robots.indexOf('Allow: /docs/vanilla/rollup-plugin-polyfill-node/') !== -1, 'robots.txt has the wrong allow path')
assert(robots.indexOf('Sitemap: ' + canonical + 'sitemap.xml') !== -1, 'robots.txt has the wrong sitemap')
assert(sitemap.indexOf('<loc>' + canonical + '</loc>') !== -1, 'sitemap lacks the canonical route')

var locations = []
var locationPattern = /<loc>([^<]+)<\/loc>/g
var locationMatch
while ((locationMatch = locationPattern.exec(sitemap))) locations.push(locationMatch[1])
assert(locations.length === 15, 'sitemap must contain exactly 15 canonical URLs')
assert(new Set(locations).size === locations.length, 'sitemap contains duplicate URLs')
locations.forEach(function (location) {
  var parsed = new URL(location)
  assert(parsed.protocol === 'https:', 'Sitemap URL must use https: ' + location)
  assert(parsed.hostname === 'alexandro.net', 'Sitemap URL must use alexandro.net: ' + location)
  assert(parsed.pathname.indexOf('/docs/vanilla/rollup-plugin-polyfill-node/') === 0, 'Sitemap URL has the wrong path: ' + location)
})

;[llms, llmsFull].forEach(function (value, index) {
  includesAll(value, [
    '@stackline/rollup-plugin-polyfill-node@1.0.0',
    'rollup-plugin-polyfill-node@0.13.0',
    'rollup-plugin-polyfill-node@npm:@stackline/rollup-plugin-polyfill-node@1.0.0',
    'Node.js 14',
    'Rollup',
    canonical,
    'urlToHttpOptions',
    'isMap',
    'UNSUPPORTED_NODE_BUILTIN',
    'crypto: true',
    '@rollup/plugin-inject@5.0.5'
  ], index === 0 ? 'llms.txt' : 'llms-full.txt')
})

includesAll(docs['COMPATIBILITY.md'], [
  'Node.js running Rollup',
  'node:util/types',
  'urlToHttpOptions',
  'formatWithOptions',
  'isMap',
  'UNSUPPORTED_NODE_BUILTIN',
  'crypto: true',
  'ba2bff6ccb95b773a7ab6460e633a64ff299796025c1e4317ee8f95a22109b6a'
], 'COMPATIBILITY.md')

includesAll(docs['SUPPORT_MATRIX.md'], [
  '`fs`',
  '`crypto`',
  'UNSUPPORTED_NODE_BUILTIN',
  'MISSING_EXPORT',
  'Legacy empty no-export placeholder',
  '`util/types`'
], 'SUPPORT_MATRIX.md')

includesAll(docs['MIGRATION.md'], [
  'rollup-plugin-polyfill-node@npm:@stackline/rollup-plugin-polyfill-node@^1.0.0',
  'Remove `node:` alias workarounds carefully',
  'nodePolyfills({ crypto: true })',
  'mark `fs` or `crypto` external'
], 'MIGRATION.md')

includesAll(docs['THIRD_PARTY_NOTICES.md'], [
  '31face71b94b8408a907f04753318dff589adc2f',
  'ionic-team/rollup-plugin-node-polyfills',
  'buffer-es6',
  'process-es6',
  'Node.js',
  'pako',
  'not shipped as runtime implementations'
], 'THIRD_PARTY_NOTICES.md')

assert(vendored.upstream.package === 'rollup-plugin-polyfill-node@0.13.0', 'vendored upstream package is wrong')
assert(vendored.upstream.commit === '31face71b94b8408a907f04753318dff589adc2f', 'vendored upstream commit is wrong')
assert(productionReview.root.name === packageName, 'production review root is wrong')
assert(productionReview.root.version === packageJson.version, 'production review version is wrong')
assert(productionReview.advisoryEvidence.result === 'PASS_ZERO_FINDINGS', 'production review audit is not green')
var injectReview = productionReview.reviews.find(function (review) { return review.name === '@rollup/plugin-inject' })
assert(injectReview && injectReview.version === '5.0.5' && injectReview.classification === 'PASS', 'plugin-inject review is missing or wrong')

var localLinkPattern = /(?:href|src)="([^"#][^"]*)"/g
var localLinkMatch
while ((localLinkMatch = localLinkPattern.exec(html))) {
  var target = localLinkMatch[1]
  if (/^(?:https:|mailto:)/.test(target)) continue
  var cleanTarget = target.split('#')[0]
  if (!cleanTarget) continue
  var inSite = fs.existsSync(path.join(siteDir, cleanTarget))
  assert(inSite, 'index.html has a broken prepared-site link: ' + target)
}

rootFiles.forEach(function (name) {
  assert(!/PLACEHOLDER|TBD/.test(docs[name]), name + ' contains unfinished placeholder text')
})
siteFiles.forEach(function (name) {
  assert(!/PLACEHOLDER|TBD/.test(site[name]), name + ' contains unfinished placeholder text')
})

console.log('rollup-plugin-polyfill-node documentation checks passed: ' + (siteFiles.length + rootFiles.length) + ' files')
