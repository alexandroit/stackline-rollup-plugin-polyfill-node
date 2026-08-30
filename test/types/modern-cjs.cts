import nodePolyfills = require('@stackline/rollup-plugin-polyfill-node');
import type { Plugin } from 'rollup';

const options: nodePolyfills.NodePolyfillsOptions = {
  baseDir: '/',
  crypto: true,
  include: null
};

const plugin: Plugin = nodePolyfills(options);
void plugin;
