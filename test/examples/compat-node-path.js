import barePath, { join as bareJoin, normalize as bareNormalize } from 'path';
import nodePath, { join as nodeJoin, normalize as nodeNormalize } from 'node:path';

export const pathCompatibility = {
  bareJoin: bareJoin('alpha', 'beta'),
  nodeJoin: nodeJoin('alpha', 'beta'),
  bareNormalize: bareNormalize('alpha/../beta'),
  nodeNormalize: nodeNormalize('alpha/../beta'),
  defaultJoinMatches: barePath.join('alpha', 'beta') === nodePath.join('alpha', 'beta')
};
