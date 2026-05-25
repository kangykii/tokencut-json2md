import assert from 'node:assert/strict';
import test from 'node:test';
import { renderTable } from '../src/render.js';
import type { SkillSchema } from '../src/types.js';

const skill: SkillSchema = {
  name: 'people',
  description: 'People table',
  columns: [
    { key: 'id', type: 'number' },
    { key: 'user.name', label: 'name', type: 'string' },
    { key: 'secret', include: false },
  ],
  flatten: {
    depth: 2,
    separator: '.',
    arrayJoin: '; ',
    arrayMaxItems: 5,
  },
};

test('renderTable includes skill header and markdown table', () => {
  const output = renderTable([{ id: 1, user: { name: 'Ada' }, secret: 'hidden' }], skill);

  assert.match(output, /^<!-- json2mdt-skill/);
  assert.match(output, /name: people/);
  assert.match(output, /\| id \| name \|/);
  assert.match(output, /\| --- \| --- \|/);
  assert.match(output, /\| 1 \| Ada \|/);
  assert.equal(output.includes('hidden'), false);
});

test('renderTable can omit skill header', () => {
  const output = renderTable([{ id: 2, user: { name: 'Grace|Hopper' } }], skill, {
    includeHeader: false,
  });

  assert.equal(output, '| id | name |\n| --- | --- |\n| 2 | Grace\\|Hopper |');
});
