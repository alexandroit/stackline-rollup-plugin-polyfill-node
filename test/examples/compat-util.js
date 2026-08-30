import util, { formatWithOptions, types } from 'util';
import utilTypes, { isDate, isMap, isNativeError, isRegExp } from 'util/types';
import { isMap as nodeIsMap } from 'node:util/types';

const inspectOptions = Object.freeze({ depth: 0, colors: false });
const inspectOptionsBefore = JSON.stringify(inspectOptions);

export const utilCompatibility = {
  formattedObject: formatWithOptions(inspectOptions, 'value: %O', { nested: { value: 1 } }),
  formattedSequence: formatWithOptions(inspectOptions, { nested: { value: 1 } }, 'tail', 2),
  formattedTokens: formatWithOptions({}, 'tokens: %s %d %j %%', 'value', '2', { ok: true }),
  typeChecks: {
    datePositive: types.isDate(new Date(0)),
    dateNegative: types.isDate({}),
    mapPositive: types.isMap(new Map()),
    mapNegative: types.isMap(new Set()),
    mapSpoofNegative: types.isMap({ [Symbol.toStringTag]: 'Map' }),
    errorPositive: types.isNativeError(new TypeError('expected')),
    errorNegative: types.isNativeError({ name: 'Error' }),
    regexpPositive: types.isRegExp(/expected/),
    regexpNegative: types.isRegExp('expected')
  },
  subpathNamedContract:
    isDate(new Date(0)) &&
    isMap(new Map()) &&
    isNativeError(new Error('expected')) &&
    isRegExp(/expected/),
  subpathDefaultContract: utilTypes === types,
  nodeSubpathContract: nodeIsMap(new Map()),
  utilDefaultContract:
    util.types === types &&
    util.formatWithOptions === formatWithOptions &&
    typeof util.format === 'function',
  inspectOptionsUnchanged: JSON.stringify(inspectOptions) === inspectOptionsBefore
};
