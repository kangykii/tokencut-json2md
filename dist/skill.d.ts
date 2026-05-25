import type { ColumnDef, SkillSchema } from './types.js';
export declare function validateSkill(value: unknown): SkillSchema;
export declare function loadSkill(path: string): SkillSchema;
export declare function generateSkill(cols: ColumnDef[], name?: string): SkillSchema;
export declare function saveSkill(skill: SkillSchema, path: string): void;
export declare function renderSkillHeader(skill: SkillSchema): string;
export type { SkillColumn, SkillSchema } from './types.js';
