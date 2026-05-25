export type ColumnType = 'string' | 'number' | 'boolean' | 'array' | 'object' | 'null';

export type ColumnDef = {
  key: string;
  type: ColumnType;
  maxLen: number;
  nullable: boolean;
};

export type SkillColumn = {
  key: string;
  label?: string;
  type?: string;
  truncate?: number;
  include?: boolean;
};

export type SkillSchema = {
  name: string;
  description?: string;
  columns: SkillColumn[];
  flatten: {
    depth: number;
    separator: string;
    arrayJoin: string;
    arrayMaxItems: number;
  };
};
