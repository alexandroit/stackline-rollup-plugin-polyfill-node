// @ts-ignore
import type { Plugin } from "rollup";
import inject, { RollupInjectOptions } from "@rollup/plugin-inject";
import { getModules } from "./modules";
import { posix, resolve } from "path";
import { builtinModules } from "module";
import POLYFILLS from './polyfills';

// Node import paths use POSIX separators
const { dirname, relative, join } = posix;

const PREFIX = `\0polyfill-node.`;
const PREFIX_LENGTH = PREFIX.length;
const NODE_BUILTINS = new Set(builtinModules.map((moduleName: string) => moduleName.replace(/^node:/, '')));

export interface NodePolyfillsOptions {
  baseDir?: string;
  crypto?: boolean;
  sourceMap?: RollupInjectOptions['sourceMap'];
  include?: Array<string | RegExp> | string | RegExp | null;
  exclude?: Array<string | RegExp> | string | RegExp | null;
}

export default function (opts: NodePolyfillsOptions = {}): Plugin {
  const mods = getModules();
  const injectPlugin = inject({
    include: opts.include === undefined ? ['node_modules/**/*.js'] : opts.include,
    exclude: opts.exclude,
    sourceMap: opts.sourceMap,
    modules: {
      process: PREFIX + "process",
      Buffer: [PREFIX + "buffer", "Buffer"],
      global: PREFIX + 'global',
      __filename: FILENAME_PATH,
      __dirname: DIRNAME_PATH,
    },
  });
  const basedir = opts.baseDir || "/";
  const dirs = new Map<string, string>();
  return {
    name: "polyfill-node",
    resolveId(importee: string, importer?: string) {
      // Fixes commonjs compatability: https://github.com/FredKSchott/rollup-plugin-polyfill-node/pull/42
      if (importee[0] == '\0' && /\?commonjs-\w+$/.test(importee)) {
        importee = importee.slice(1).replace(/\?commonjs-\w+$/, '');
      }
      if (importee.startsWith('node:')) {
        const bareImportee = importee.slice(5);
        if (NODE_BUILTINS.has(bareImportee) && mods.has(bareImportee)) {
          importee = bareImportee;
        }
      }
      if (importee === 'fs' || (importee === 'crypto' && opts.crypto !== true)) {
        throw unsupportedBuiltinError(importee);
      }
      if (importee === DIRNAME_PATH) {
        const id = getPathId(DIRNAME_PATH, basedir, importer);
        dirs.set(id, dirname("/" + relative(basedir, importer || basedir)));
        return { id, moduleSideEffects: false };
      }
      if (importee === FILENAME_PATH) {
        const id = getPathId(FILENAME_PATH, basedir, importer);
        dirs.set(id, "/" + relative(basedir, importer || basedir));
        return { id, moduleSideEffects: false };
      }
      if (importee && importee.slice(-1) === "/") {
        importee = importee.slice(0, -1);
      }
      if (importer && importer.startsWith(PREFIX) && importee.startsWith('.')) {
        importee = PREFIX + join(importer.substr(PREFIX_LENGTH).replace('.js', ''), '..', importee) + '.js';
      }
      if (importee.startsWith(PREFIX)) {
        importee = importee.substr(PREFIX_LENGTH);
      }
      if (mods.has(importee) || (POLYFILLS as any)[importee.replace('.js', '') + '.js']) {
        return { id: PREFIX + importee.replace('.js', '') + '.js', moduleSideEffects: false };
      }
      return null;
    },
    load(id: string) {
      if (dirs.has(id)) {
        return `export default ${JSON.stringify(dirs.get(id))}`;
      }
      if (id.startsWith(PREFIX)) {
        const importee = id.substr(PREFIX_LENGTH).replace('.js', '');
        return mods.get(importee) || (POLYFILLS as any)[importee + '.js'];
      } 

    },
    transform(code: string, id: string) {
      if(id === PREFIX + 'global.js') return
      // @ts-ignore
      return injectPlugin.transform!.call(this, code, id.replace(PREFIX, resolve('node_modules', 'polyfill-node')));
    },
  };
}

function getPathId(type: string, basedir: string, importer?: string) {
  return `${type}:${relative(basedir, importer || basedir)}`;
}

function unsupportedBuiltinError(moduleName: string) {
  const error = new Error(
    `The Node.js "${moduleName}" builtin is intentionally unsupported in browser bundles. ` +
    'Provide a browser implementation or mark the import as external.'
  ) as Error & { code: string };
  error.code = 'UNSUPPORTED_NODE_BUILTIN';
  return error;
}

const DIRNAME_PATH = "\0node-polyfills:dirname";
const FILENAME_PATH = "\0node-polyfills:filename";
