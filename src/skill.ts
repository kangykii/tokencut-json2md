import { readFileSync, writeFileSync } from 'node:fs';
import type { ColumnDef, SkillColumn, SkillSchema } from './types.js';

const DEFAULT_FLATTEN = {
  depth: 2,
  separator: '.',
  arrayJoin: '; ',
  arrayMaxItems: 5,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stringProp(source: Record<string, unknown>, key: string, fallback?: string): string | undefined {
  const value = source[key];
  return typeof value === 'string' ? value : fallback;
}

function numberProp(source: Record<string, unknown>, key: string, fallback: number): number {
  const value = source[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function booleanProp(source: Record<string, unknown>, key: string): boolean | undefined {
  const value = source[key];
  return typeof value === 'boolean' ? value : undefined;
}

function validateColumn(value: unknown, index: number): SkillColumn {
  if (!isRecord(value)) {
    throw new Error(`Invalid skill: columns[${index}] must be an object`);
  }

  const key = stringProp(value, 'key');
  if (!key) {
    throw new Error(`Invalid skill: columns[${index}].key must be a string`);
  }

  const column: SkillColumn = { key };
  const label = stringProp(value, 'label');
  const type = stringProp(value, 'type');
  const truncate = value.truncate;
  const include = booleanProp(value, 'include');

  if (label !== undefined) column.label = label;
  if (type !== undefined) column.type = type;
  if (truncate !== undefined) {
    if (typeof truncate !== 'number' || !Number.isFinite(truncate) || truncate < 0) {
      throw new Error(`Invalid skill: columns[${index}].truncate must be a non-negative number`);
    }
    column.truncate = truncate;
  }
  if (include !== undefined) column.include = include;

  return column;
}

export function validateSkill(value: unknown): SkillSchema {
  if (!isRecord(value)) {
    throw new Error('Invalid skill: root must be an object');
  }

  const name = stringProp(value, 'name');
  if (!name) {
    throw new Error('Invalid skill: name must be a string');
  }

  if (!Array.isArray(value.columns)) {
    throw new Error('Invalid skill: columns must be an array');
  }

  const flattenSource = isRecord(value.flatten) ? value.flatten : {};
  const skill: SkillSchema = {
    name,
    columns: value.columns.map(validateColumn),
    flatten: {
      depth: numberProp(flattenSource, 'depth', DEFAULT_FLATTEN.depth),
      separator: stringProp(flattenSource, 'separator', DEFAULT_FLATTEN.separator) ?? DEFAULT_FLATTEN.separator,
      arrayJoin: stringProp(flattenSource, 'arrayJoin', DEFAULT_FLATTEN.arrayJoin) ?? DEFAULT_FLATTEN.arrayJoin,
      arrayMaxItems: numberProp(flattenSource, 'arrayMaxItems', DEFAULT_FLATTEN.arrayMaxItems),
    },
  };

  const description = stringProp(value, 'description');
  if (description !== undefined) skill.description = description;

  return skill;
}

export function loadSkill(path: string): SkillSchema {
  const source = readFileSync(path, 'utf8');
  try {
    return validateSkill(JSON.parse(source));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to load skill ${path}: ${message}`);
  }
}

export function generateSkill(cols: ColumnDef[], name = 'json2mdt-skill'): SkillSchema {
  return {
    name,
    description: 'Column semantics for a json2mdt Markdown table.',
    columns: cols.map((col) => ({
      key: col.key,
      type: col.type,
      truncate: 120,
      include: true,
    })),
    flatten: { ...DEFAULT_FLATTEN },
  };
}

export function saveSkill(skill: SkillSchema, path: string): void {
  writeFileSync(path, `${JSON.stringify(validateSkill(skill), null, 2)}\n`, 'utf8');
}

export function renderSkillHeader(skill: SkillSchema): string {
  const columns = skill.columns
    .filter((column) => column.include !== false)
    .map((column) => {
      const label = column.label && column.label !== column.key ? ` label=${column.label}` : '';
      const type = column.type ? ` type=${column.type}` : '';
      const truncate = column.truncate !== undefined ? ` truncate=${column.truncate}` : '';
      return `- ${column.key}${label}${type}${truncate}`;
    })
    .join('\n');

  const description = skill.description ? `\ndescription: ${skill.description}` : '';

  return `<!-- json2mdt-skill
name: ${skill.name}${description}
flatten: depth=${skill.flatten.depth} separator="${skill.flatten.separator}" arrayJoin="${skill.flatten.arrayJoin}" arrayMaxItems=${skill.flatten.arrayMaxItems}
columns:
${columns}
-->
`;
}

export type { SkillColumn, SkillSchema } from './types.js';
