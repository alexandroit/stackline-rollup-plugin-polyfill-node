export interface NodePolyfillsOptions {
  baseDir?: string;
  crypto?: boolean;
  sourceMap?: boolean;
  include?: Array<string | RegExp> | string | RegExp | null;
  exclude?: Array<string | RegExp> | string | RegExp | null;
}

export interface RollupPluginLike {
  name: string;
  [hook: string]: unknown;
}

declare function nodePolyfills(options?: NodePolyfillsOptions): RollupPluginLike;
export default nodePolyfills;
