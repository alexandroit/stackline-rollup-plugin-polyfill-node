import { readFile } from 'node:fs/promises';
import path from 'node:path';

function dependencyGroups(metadata) {
  return [
    ['runtime', metadata.dependencies || {}],
    ['optional', metadata.optionalDependencies || {}],
    ['peer', metadata.peerDependencies || {}]
  ];
}

function resolveLocation(packages, parentLocation, name) {
  let current = parentLocation;
  while (current) {
    const nested = `${current}/node_modules/${name}`;
    if (packages[nested]) return nested;
    const slash = current.lastIndexOf('/');
    current = slash === -1 ? '' : current.slice(0, slash);
  }
  const rootLocation = `node_modules/${name}`;
  return packages[rootLocation] ? rootLocation : null;
}

export async function materializeProductionClosure(root) {
  const lock = JSON.parse(await readFile(path.join(root, 'package-lock.json'), 'utf8'));
  const packages = lock.packages || {};
  const rootMetadata = packages[''];
  if (!rootMetadata) throw new Error('package-lock.json is missing the root package record');

  const visited = new Set();
  const queue = [];
  const edges = [];
  for (const [type, dependencies] of dependencyGroups(rootMetadata)) {
    for (const [name, spec] of Object.entries(dependencies)) {
      const location = resolveLocation(packages, '', name);
      if (!location) throw new Error(`Unresolved ${type} dependency ${name}@${spec}`);
      edges.push({ from: '.', to: location, name, spec, type });
      queue.push(location);
    }
  }

  while (queue.length) {
    const location = queue.shift();
    if (visited.has(location)) continue;
    visited.add(location);
    const metadata = packages[location];
    if (!metadata) throw new Error(`Missing lock metadata for ${location}`);
    for (const [type, dependencies] of dependencyGroups(metadata)) {
      for (const [name, spec] of Object.entries(dependencies)) {
        const child = resolveLocation(packages, location, name);
        if (!child) {
          const optional = type === 'optional' || metadata.peerDependenciesMeta?.[name]?.optional;
          if (optional) continue;
          throw new Error(`Unresolved ${type} dependency ${name}@${spec} from ${location}`);
        }
        edges.push({ from: location, to: child, name, spec, type });
        queue.push(child);
      }
    }
  }

  const nodes = [...visited].sort().map((location) => {
    const metadata = packages[location];
    const name = location.slice(location.lastIndexOf('node_modules/') + 13);
    return {
      name,
      version: metadata.version,
      location,
      license: metadata.license || null,
      deprecated: metadata.deprecated || null,
      optional: Boolean(metadata.optional),
      peer: Boolean(metadata.peer),
      integrity: metadata.integrity || null,
      resolved: metadata.resolved || null
    };
  });

  return {
    schema: 'stackline-production-closure-v1',
    root: `${rootMetadata.name}@${rootMetadata.version}`,
    source: 'package-lock.json',
    nodeCountIncludingRoot: nodes.length + 1,
    dependencyNodeCount: nodes.length,
    edgeCount: edges.length,
    edgeTypeCounts: {
      runtime: edges.filter((edge) => edge.type === 'runtime').length,
      optional: edges.filter((edge) => edge.type === 'optional').length,
      peer: edges.filter((edge) => edge.type === 'peer').length
    },
    nodes,
    edges: edges.sort((a, b) => `${a.from}:${a.type}:${a.name}`.localeCompare(`${b.from}:${b.type}:${b.name}`, 'en'))
  };
}
