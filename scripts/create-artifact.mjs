import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  access,
  chmod,
  copyFile,
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rename,
  rm,
  writeFile
} from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const destination = path.join(root, 'release-candidate');
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const upstream = {
  package: 'rollup-plugin-polyfill-node@0.13.0',
  repository: 'https://github.com/FredKSchott/rollup-plugin-polyfill-node',
  commit: '31face71b94b8408a907f04753318dff589adc2f',
  tarball: {
    url: 'https://registry.npmjs.org/rollup-plugin-polyfill-node/-/rollup-plugin-polyfill-node-0.13.0.tgz',
    fileCount: 12,
    unpackedSize: 1058136,
    sha1: '28e5705b59438da894e55133a0fe7a86b57d9b0a',
    sha256: '27b5e645f1a4e529613cea6a374db2246cfdec57c651b4584cc582eafaf30960',
    sha512: '15812fa42683e631adc81b8115c4089841a64f10d33db8878c976b608a7e98523081789769bc6f2942bb653f4fdf5a33bb64ea9bd9656103115ac7ef4cc4c03b',
    integrity: 'sha512-FYEvpCaD5jGtyBuBFcQImEGmTxDTPbiHjJdrYIp+mFIwgXiXabxvKUK7ZT9P31ozu2Tqm9llYQMRWsfvTMTAOw=='
  }
};

function run(executable, arguments_, options = {}) {
  return execFileSync(executable, arguments_, {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, NO_UPDATE_NOTIFIER: '1' },
    stdio: ['ignore', 'pipe', 'pipe'],
    ...options
  });
}

function runNpm(arguments_, options = {}) {
  return run(npm, arguments_, options);
}

function git(arguments_) {
  return run('git', arguments_).trim();
}

function digest(algorithm, bytes, encoding = 'hex') {
  return createHash(algorithm).update(bytes).digest(encoding);
}

function parsePackOutput(output) {
  const trimmed = output.trim();
  const jsonStart = trimmed.lastIndexOf('\n[');
  const result = JSON.parse(jsonStart === -1 ? trimmed : trimmed.slice(jsonStart + 1));
  assert.equal(result.length, 1, 'npm pack must produce exactly one archive');
  return result[0];
}

function assertReleaseTagState(expectedTag, validationTag) {
  const tagsAtHead = git(['tag', '--points-at', 'HEAD', '--list', 'stackline-v*']);
  if (validationTag) {
    assert.equal(validationTag, expectedTag, 'CI may validate only the package version tag');
    assert.equal(tagsAtHead, expectedTag, `${expectedTag} must be the only Stackline release tag at HEAD`);
    return true;
  }
  assert.equal(git(['tag', '--list', expectedTag]), '', `${expectedTag} already exists`);
  assert.equal(tagsAtHead, '', 'HEAD must not already carry a Stackline release tag');
  return false;
}

async function copyNormalized(source, target) {
  const metadata = await lstat(source);
  if (metadata.isDirectory()) {
    await mkdir(target, { recursive: true, mode: 0o755 });
    await chmod(target, 0o755);
    const entries = await readdir(source, { withFileTypes: true });
    for (const entry of entries.sort((left, right) => left.name < right.name ? -1 : left.name > right.name ? 1 : 0)) {
      await copyNormalized(path.join(source, entry.name), path.join(target, entry.name));
    }
    return;
  }
  assert(metadata.isFile(), `package input must be a regular file or directory: ${source}`);
  await mkdir(path.dirname(target), { recursive: true, mode: 0o755 });
  await copyFile(source, target);
  await chmod(target, 0o644);
}

async function requireAbsent(target) {
  try {
    await access(target);
    assert.fail(`release candidate already exists: ${target}`);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}

await requireAbsent(destination);

const packageBytes = await readFile(path.join(root, 'package.json'));
const packageJson = JSON.parse(packageBytes);
const expectedTag = `stackline-v${packageJson.version}`;
const validationTag = process.env.STACKLINE_ARTIFACT_VALIDATION_TAG || '';
const builderNpm = runNpm(['--version']).trim();
assert.equal(process.version, 'v24.20.0', 'artifact preparation requires Node.js 24.20.0');
assert.equal(builderNpm, '11.19.0', 'artifact preparation requires npm 11.19.0');
const sourceCommit = git(['rev-parse', '--verify', 'HEAD^{commit}']);
assert.match(sourceCommit, /^[0-9a-f]{40}$/, 'artifact preparation requires a committed Git HEAD');
assert.equal(
  git(['status', '--porcelain=v1', '--untracked-files=all']),
  '',
  'artifact preparation requires a clean worktree'
);
const releaseTagPresent = assertReleaseTagState(expectedTag, validationTag);

runNpm(['run', 'verify'], { stdio: 'inherit' });

assert.equal(
  git(['status', '--porcelain=v1', '--untracked-files=all']),
  '',
  'verification changed committed source files'
);
assert.equal(await readFile(path.join(root, 'package.json'), 'utf8'), packageBytes.toString('utf8'));
assertReleaseTagState(expectedTag, validationTag);

const productionReviewBytes = await readFile(path.join(root, 'PRODUCTION_DEPENDENCY_REVIEW.json'));
const vendoredBytes = await readFile(path.join(root, 'VENDORED_COMPONENTS.json'));
const sbomBytes = await readFile(path.join(root, 'sbom.cdx.json'));
const productionReview = JSON.parse(productionReviewBytes);
const vendored = JSON.parse(vendoredBytes);
const sbom = JSON.parse(sbomBytes);

assert.equal(productionReview.schema, 'stackline-production-dependency-review-v1');
assert.equal(productionReview.root?.name, packageJson.name);
assert.equal(productionReview.root?.version, packageJson.version);
assert.equal(productionReview.root?.classification, 'PASS');
assert(productionReview.reviews.every((review) => review.classification === 'PASS'));
assert.equal(vendored.schema, 'stackline-vendored-components-v1');
assert.equal(vendored.upstream?.package, upstream.package);
assert.equal(vendored.upstream?.repository, upstream.repository);
assert.equal(vendored.upstream?.commit, upstream.commit);
assert.equal(sbom.metadata?.component?.name, packageJson.name);
assert.equal(sbom.metadata?.component?.version, packageJson.version);
assert.equal(
  Buffer.from(upstream.tarball.integrity.slice('sha512-'.length), 'base64').toString('hex'),
  upstream.tarball.sha512
);

let staging = await mkdtemp(path.join(root, '.release-candidate-staging-'));

try {
  const packageSource = await mkdtemp(path.join(staging, '.package-source-'));
  const packageInputs = ['package.json', ...packageJson.files];
  for (const relative of packageInputs) {
    assert.equal(path.isAbsolute(relative), false, `package input must be relative: ${relative}`);
    assert.equal(relative.split('/').includes('..'), false, `package input escapes the project: ${relative}`);
    await copyNormalized(path.join(root, relative), path.join(packageSource, relative));
  }

  const packOutput = runNpm([
    'pack',
    '--silent',
    '--json',
    '--ignore-scripts',
    '--pack-destination',
    staging
  ], { cwd: packageSource });
  const packed = parsePackOutput(packOutput);
  const archive = path.join(staging, packed.filename);
  const archiveBytes = await readFile(archive);
  await rm(packageSource, { force: true, recursive: true });

  const sha1 = digest('sha1', archiveBytes);
  const sha256 = digest('sha256', archiveBytes);
  const sha512 = digest('sha512', archiveBytes);
  const integrity = `sha512-${digest('sha512', archiveBytes, 'base64')}`;
  assert.equal(packed.name, packageJson.name);
  assert.equal(packed.version, packageJson.version);
  assert.equal(packed.shasum, sha1);
  assert.equal(packed.integrity, integrity);
  assert.equal(packed.size, archiveBytes.length);
  assert(packed.files.some((file) => file.path === 'dist/index.js'), 'archive must contain the built CommonJS entry');
  assert(packed.files.some((file) => file.path === 'dist/es/index.js'), 'archive must contain the built ESM entry');
  assert(packed.files.every(({ mode }) => mode === 0o644), 'every shipped regular file must have mode 0644');

  const files = packed.files
    .map(({ path: file, size, mode }) => ({ file, size, mode }))
    .sort((left, right) => left.file < right.file ? -1 : left.file > right.file ? 1 : 0);
  const commitTimestamp = new Date(git(['show', '-s', '--format=%cI', sourceCommit])).toISOString();
  const manifest = {
    schema: 'stackline-release-artifact-v1',
    package: `${packageJson.name}@${packageJson.version}`,
    filename: packed.filename,
    sha1,
    sha256,
    sha512,
    integrity,
    packedSize: packed.size,
    unpackedSize: packed.unpackedSize,
    entryCount: packed.entryCount,
    modePolicy: 'all shipped regular files are 0644',
    sourceCommit,
    commitTimestamp,
    intendedReleaseTag: expectedTag,
    releaseTagPresent,
    builder: {
      node: process.version,
      npm: builderNpm,
      platform: `${process.platform}-${process.arch}`,
      environment: process.env.GITHUB_ACTIONS === 'true'
        ? 'github-actions-canonical-gate'
        : 'local-stackline-release-gate'
    },
    files
  };

  const licenses = {
    schema: 'stackline-release-licenses-v1',
    package: {
      name: packageJson.name,
      version: packageJson.version,
      license: packageJson.license,
      file: 'LICENSE.md'
    },
    sourceRecords: [
      { file: 'PRODUCTION_DEPENDENCY_REVIEW.json', sha256: digest('sha256', productionReviewBytes) },
      { file: 'VENDORED_COMPONENTS.json', sha256: digest('sha256', vendoredBytes) }
    ],
    productionReview: {
      schema: productionReview.schema,
      observedAt: productionReview.observedAt,
      advisoryEvidence: productionReview.advisoryEvidence,
      root: productionReview.root
    },
    productionDependencies: productionReview.reviews,
    vendoredUpstream: vendored.upstream,
    vendoredComponents: vendored.components,
    notices: ['NOTICE', 'THIRD_PARTY_NOTICES.md']
  };

  const provenance = {
    schema: 'stackline-source-provenance-v1',
    releaseSource: {
      package: `${packageJson.name}@${packageJson.version}`,
      commit: sourceCommit,
      commitTimestamp,
      intendedReleaseTag: expectedTag,
      releaseTagPresent
    },
    compatibilityBaseline: upstream
  };

  await writeFile(path.join(staging, 'artifact-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  await writeFile(path.join(staging, 'licenses.json'), `${JSON.stringify(licenses, null, 2)}\n`);
  await writeFile(path.join(staging, 'source-provenance.json'), `${JSON.stringify(provenance, null, 2)}\n`);
  await writeFile(path.join(staging, 'SHA1SUMS'), `${sha1}  ${packed.filename}\n`);
  await writeFile(path.join(staging, 'SHA256SUMS'), `${sha256}  ${packed.filename}\n`);
  await writeFile(path.join(staging, 'SHA512SUMS'), `${sha512}  ${packed.filename}\n`);
  await copyFile(path.join(root, 'sbom.cdx.json'), path.join(staging, 'sbom.cdx.json'));
  await copyFile(path.join(root, 'CHANGELOG.md'), path.join(staging, 'RELEASE_NOTES.md'));
  assert.deepEqual(await readFile(path.join(staging, 'sbom.cdx.json')), sbomBytes, 'release SBOM must be an exact copy');

  await rename(staging, destination);
  staging = null;
  console.log(`Prepared unpublished ${packed.filename} (${sha256}).`);
} finally {
  if (staging) await rm(staging, { force: true, recursive: true });
}
