import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { materializeProductionClosure } from './production-closure.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const expected = await materializeProductionClosure(root);
const persisted = JSON.parse(await readFile(path.join(root, 'dist', 'production-closure.json'), 'utf8'));
if (JSON.stringify(expected) !== JSON.stringify(persisted)) throw new Error('Persisted closure does not match package-lock.json');

const dependencyReview = JSON.parse(await readFile(
  path.join(root, 'PRODUCTION_DEPENDENCY_REVIEW.json'),
  'utf8'
));
if (dependencyReview.root?.classification !== 'PASS') {
  throw new Error('The root production-dependency review is not PASS');
}
if (`${dependencyReview.root.name}@${dependencyReview.root.version}` !== expected.root) {
  throw new Error('The production-dependency review belongs to a different package version');
}

for (const review of dependencyReview.reviews) {
  const matches = expected.nodes.filter((node) => (
    (review.name ? node.name === review.name : node.name.startsWith(review.namePrefix)) &&
    node.version === review.version
  ));
  const requiredCount = review.expectedNodeCount || 1;
  if (matches.length !== requiredCount) {
    throw new Error(`Dependency review does not match closure: ${review.name || review.namePrefix}@${review.version}`);
  }
  if (review.classification !== 'PASS' || !review.license || !review.maintenance || !review.source) {
    throw new Error(`Incomplete production review: ${review.name || review.namePrefix}@${review.version}`);
  }
}

for (const node of expected.nodes) {
  const review = dependencyReview.reviews.find((candidate) => (
    (candidate.name ? node.name === candidate.name : node.name.startsWith(candidate.namePrefix)) &&
    node.version === candidate.version
  ));
  if (!review) throw new Error(`Unreviewed production node: ${node.name}@${node.version}`);
  if ((node.license || review.license) !== review.license) {
    throw new Error(`License review mismatch: ${node.name}@${node.version}`);
  }
  if (node.deprecated) throw new Error(`Deprecated production node: ${node.name}@${node.version}: ${node.deprecated}`);
}

const tree = JSON.parse(execFileSync(npm, ['ls', '--all', '--omit=dev', '--json'], {
  cwd: root,
  encoding: 'utf8'
}));
if (tree.problems?.length) throw new Error(`npm ls problems: ${tree.problems.join('; ')}`);
console.log(`production closure: pass (${expected.nodeCountIncludingRoot} nodes, ${expected.edgeCount} edges)`);
