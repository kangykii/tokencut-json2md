import type { SkillSchema } from './types.js';
type FlatRow = Record<string, string>;
export declare function flattenRow(row: object, skill: SkillSchema): FlatRow;
export {};
