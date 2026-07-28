import * as migration_20260728_150221_initial from './20260728_150221_initial';
import * as migration_20260728_162651_invites_and_forms from './20260728_162651_invites_and_forms';

export const migrations = [
  {
    up: migration_20260728_150221_initial.up,
    down: migration_20260728_150221_initial.down,
    name: '20260728_150221_initial',
  },
  {
    up: migration_20260728_162651_invites_and_forms.up,
    down: migration_20260728_162651_invites_and_forms.down,
    name: '20260728_162651_invites_and_forms'
  },
];
