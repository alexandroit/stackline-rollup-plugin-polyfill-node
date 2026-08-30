import type { Plugin } from 'rollup';
import type { RollupInjectOptions } from '@rollup/plugin-inject';

declare function nodePolyfills(options?: nodePolyfills.NodePolyfillsOptions): Plugin;

declare namespace nodePolyfills {
  interface NodePolyfillsOptions {
    baseDir?: string;
    crypto?: boolean;
    sourceMap?: RollupInjectOptions['sourceMap'];
    include?: Array<string | RegExp> | string | RegExp | null;
    exclude?: Array<string | RegExp> | string | RegExp | null;
  }
}

export = nodePolyfills;
