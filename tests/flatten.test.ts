import assert from 'node:assert/strict';
import test from 'node:test';
import { flattenRow } from '../src/flatten.js';
import type { SkillSchema } from '../src/types.js';

const skill: SkillSchema = {
  name: 'test',
  columns: [
    { key: 'user.name', label: 'name', truncate: 3 },
    { key: 'active' },
    { key: 'score' },
    { key: 'tags', truncate: 100 },
    { key: 'missing' },
    { key: 'profile', truncate: 12 },
  ],
  flatten: {
    depth: 2,
    separator: '.',
    arrayJoin: '; ',
    arrayMaxItems: 2,
  },
};

test('flattenRow resolves dot paths and formats scalar values', () => {
  const row = flattenRow(
    {
      user: { name: 'Alice' },
      active: false,
      score: 42,
      tags: ['red'],
      profile: null,
    },
    skill,
  );

  assert.equal(row.name, 'Ali…');
  assert.equal(row.active, 'false');
  assert.equal(row.score, '42');
  assert.equal(row.missing, '');
  assert.equal(row.profile, '');
});

test('flattenRow joins arrays with overflow count', () => {
  const row = flattenRow(
    {
      user: { name: 'Bo' },
      tags: ['alpha', 'beta', 'gamma', 'delta'],
      profile: { city: 'Paris' },
    },
    skill,
  );

  assert.equal(row.tags, 'alpha; beta [+2 more]');
});

test('flattenRow stringifies and truncates objects', () => {
  const row = flattenRow(
    {
      user: { name: 'Cy' },
      tags: [],
      profile: { city: 'Paris', country: 'France' },
    },
    skill,
  );

  assert.equal(row.profile, '{"city":"Par…');
});
