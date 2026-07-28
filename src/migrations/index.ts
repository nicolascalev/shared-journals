import * as migration_20260728_150221_initial from './20260728_150221_initial';

export const migrations = [
  {
    up: migration_20260728_150221_initial.up,
    down: migration_20260728_150221_initial.down,
    name: '20260728_150221_initial'
  },
];
