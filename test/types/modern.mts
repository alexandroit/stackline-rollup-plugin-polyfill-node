import nodePolyfills, { type NodePolyfillsOptions } from '@stackline/rollup-plugin-polyfill-node';
import type { Plugin } from 'rollup';

const options: NodePolyfillsOptions = {
  baseDir: '/',
  crypto: false,
  sourceMap: true,
  include: ['src/**/*.ts'],
  exclude: null
};

const plugin: Plugin = nodePolyfills(options);
void plugin;
