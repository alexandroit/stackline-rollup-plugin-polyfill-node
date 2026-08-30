import assert from 'node:assert/strict'
import { chmod, copyFile, lstat, mkdtemp, readdir, rename, rm } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

var sourceSiteDir = path.dirname(fileURLToPath(import.meta.url))
var projectDir = path.resolve(sourceSiteDir, '..')
var destination = path.join(sourceSiteDir, 'dist')
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

async function copyRegularFile (source, target) {
  var metadata = await lstat(source)
  assert(metadata.isFile(), 'documentation input must be a regular file: ' + source)
  await copyFile(source, target)
  await chmod(target, 0o644)
}

var staging = await mkdtemp(path.join(sourceSiteDir, '.dist-staging-'))
try {
  await chmod(staging, 0o755)
  for (var siteFile of siteFiles) {
    await copyRegularFile(path.join(sourceSiteDir, siteFile), path.join(staging, siteFile))
  }
  for (var rootFile of rootFiles) {
    await copyRegularFile(path.join(projectDir, rootFile), path.join(staging, rootFile))
  }

  var preparedFiles = (await readdir(staging)).sort()
  assert.deepEqual(preparedFiles, [...siteFiles, ...rootFiles].sort(), 'prepared site inventory is incomplete')
  await rm(destination, { force: true, recursive: true })
  await rename(staging, destination)
  staging = null
  console.log('Prepared self-contained documentation tree: ' + preparedFiles.length + ' files')
} finally {
  if (staging) await rm(staging, { force: true, recursive: true })
}
