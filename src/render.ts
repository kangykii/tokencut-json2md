import { flattenRow } from './flatten.js';
import { renderSkillHeader } from './skill.js';
import type { SkillSchema } from './types.js';

export type RenderOptions = {
  includeHeader?: boolean;
};

function escapeCell(value: string): string {
  return value.replaceAll('\\', '\\\\').replaceAll('|', '\\|').replaceAll('\r', ' ').replaceAll('\n', '<br>');
}

function row(values: string[]): string {
  return `| ${values.map(escapeCell).join(' | ')} |`;
}

export function renderTable(rows: object[], skill: SkillSchema, options: RenderOptions = {}): string {
  const columns = skill.columns.filter((column) => column.include !== false);
  const headers = columns.map((column) => column.label ?? column.key);
  const flatRows = rows.map((input) => flattenRow(input, skill));

  const table = [
    row(headers),
    row(headers.map(() => '---')),
    ...flatRows.map((flat) => row(headers.map((header) => flat[header] ?? ''))),
  ].join('\n');

  if (options.includeHeader === false) {
    return table;
  }

  return `${renderSkillHeader(skill)}\n${table}`;
}
