import assert from 'node:assert/strict';
import test from 'node:test';
import { detectSchema } from '../src/detect.js';

test('detectSchema infers flat columns', () => {
  const cols = detectSchema([
    { id: 1, name: 'Ada', active: true },
    { id: 2, name: 'Grace', active: false },
  ]);

  assert.deepEqual(cols.map((col) => col.key), ['active', 'id', 'name']);
  assert.equal(cols.find((col) => col.key === 'id')?.type, 'number');
  assert.equal(cols.find((col) => col.key === 'name')?.maxLen, 5);
});

test('detectSchema walks nested leaves up to depth 3', () => {
  const cols = detectSchema([
    {
      id: 1,
      user: {
        name: 'Ada',
        profile: { city: 'London', meta: { ignored: true } },
      },
    },
  ]);

  assert.deepEqual(cols.map((col) => col.key), [
    'id',
    'user.name',
    'user.profile.city',
    'user.profile.meta',
  ]);
  assert.equal(cols.find((col) => col.key === 'user.profile.meta')?.type, 'object');
});

test('detectSchema marks sparse values nullable and skips all-null columns', () => {
  const cols = detectSchema([
    { id: 1, nickname: null, email: 'a@example.com' },
    { id: 2, nickname: undefined, email: null },
    { id: 3, email: 'c@example.com' },
  ]);

  assert.equal(cols.some((col) => col.key === 'nickname'), false);
  assert.equal(cols.find((col) => col.key === 'email')?.nullable, true);
});
