import type { SkillSchema } from './types.js';
export type RenderOptions = {
    includeHeader?: boolean;
};
export declare function renderTable(rows: object[], skill: SkillSchema, options?: RenderOptions): string;
