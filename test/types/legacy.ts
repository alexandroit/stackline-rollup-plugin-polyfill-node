import nodePolyfills, { NodePolyfillsOptions } from '@stackline/rollup-plugin-polyfill-node';

const options: NodePolyfillsOptions = {
  baseDir: '/',
  sourceMap: false,
  include: null,
  exclude: [/server/]
};

const plugin = nodePolyfills(options);
const name: string = plugin.name;
void name;
