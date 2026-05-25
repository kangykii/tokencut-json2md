#!/usr/bin/env node

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { basename } from 'node:path';
import process from 'node:process';
import { detectSchema } from './detect.js';
import { renderTable } from './render.js';
import { generateSkill, loadSkill, saveSkill } from './skill.js';
import type { SkillSchema } from './types.js';

type CliOptions = {
  inputPath?: string;
  skillPath?: string;
  saveSkill: boolean;
  depth?: number;
  truncate?: number;
  maxArray?: number;
  outPath?: string;
  includeHeader: boolean;
  help: boolean;
};

const USAGE = `Usage:
  json2mdt [file.json]
  cat data.json | json2mdt

Options:
  --skill <path>       Load/save skill schema file (.skill.json)
  --save-skill         Auto-save inferred skill alongside input file
  --depth <number>     Flatten depth (default: 2)
  --truncate <number>  Max cell chars (default: 120)
  --max-array <number> Max array items shown (default: 5)
  --out <path>         Write output to file instead of stdout
  --no-header          Omit the skill header comment block
  --help               Show this help
`;

function readStdin(): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => {
      data += chunk;
    });
    process.stdin.on('end', () => resolve(data));
    process.stdin.on('error', reject);
  });
}

function parsePositiveInteger(raw: string | undefined, option: string): number {
  if (!raw) throw new Error(`${option} requires a number`);
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${option} must be a non-negative integer`);
  }
  return value;
}

function parseArgs(args: string[]): CliOptions {
  const options: CliOptions = {
    saveSkill: false,
    includeHeader: true,
    help: false,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    switch (arg) {
      case '--help':
      case '-h':
        options.help = true;
        break;
      case '--skill':
        options.skillPath = args[++index];
        if (!options.skillPath) throw new Error('--skill requires a path');
        break;
      case '--save-skill':
        options.saveSkill = true;
        break;
      case '--depth':
        options.depth = parsePositiveInteger(args[++index], '--depth');
        break;
      case '--truncate':
        options.truncate = parsePositiveInteger(args[++index], '--truncate');
        break;
      case '--max-array':
        options.maxArray = parsePositiveInteger(args[++index], '--max-array');
        break;
      case '--out':
        options.outPath = args[++index];
        if (!options.outPath) throw new Error('--out requires a path');
        break;
      case '--no-header':
        options.includeHeader = false;
        break;
      default:
        if (arg.startsWith('--')) {
          throw new Error(`Unknown option: ${arg}`);
        }
        if (options.inputPath) {
          throw new Error(`Unexpected extra input path: ${arg}`);
        }
        options.inputPath = arg;
        break;
    }
  }

  return options;
}

function unwrapRows(value: unknown): object[] {
  if (Array.isArray(value)) {
    if (!value.every((row) => typeof row === 'object' && row !== null && !Array.isArray(row))) {
      throw new Error('Input array must contain JSON objects');
    }
    return value as object[];
  }

  if (typeof value === 'object' && value !== null) {
    const arrayEntries = Object.entries(value).filter(([, entryValue]) => Array.isArray(entryValue));
    if (arrayEntries.length === 1) {
      const [key, rows] = arrayEntries[0];
      process.stderr.write(`Auto-unwrapped array at key "${key}"\n`);
      return unwrapRows(rows);
    }
  }

  throw new Error('Input must be a JSON array, or an object with exactly one array-valued key');
}

function applyCliOverrides(skill: SkillSchema, options: CliOptions): SkillSchema {
  return {
    ...skill,
    columns: skill.columns.map((column) => ({
      ...column,
      truncate: options.truncate ?? column.truncate ?? 120,
    })),
    flatten: {
      ...skill.flatten,
      depth: options.depth ?? skill.flatten.depth,
      arrayMaxItems: options.maxArray ?? skill.flatten.arrayMaxItems,
    },
  };
}

function defaultSkillPath(inputPath: string): string {
  return `${inputPath.replace(/\.json$/i, '')}.skill.json`;
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    process.stdout.write(USAGE);
    return;
  }

  const source = options.inputPath ? readFileSync(options.inputPath, 'utf8') : await readStdin();
  let parsed: unknown;
  try {
    parsed = JSON.parse(source);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Malformed JSON: ${message}`);
  }

  const rows = unwrapRows(parsed);
  let skill: SkillSchema;

  if (options.skillPath && existsSync(options.skillPath)) {
    skill = loadSkill(options.skillPath);
  } else {
    const name = options.inputPath ? basename(options.inputPath).replace(/\.json$/i, '') : 'stdin';
    skill = applyCliOverrides(generateSkill(detectSchema(rows), name), options);
    if (options.skillPath) {
      saveSkill(skill, options.skillPath);
      process.stderr.write(`Skill saved to ${options.skillPath}\n`);
    }
  }

  skill = applyCliOverrides(skill, options);

  if (options.saveSkill && !options.skillPath) {
    if (!options.inputPath) {
      throw new Error('--save-skill requires a file input path unless --skill is provided');
    }
    const path = defaultSkillPath(options.inputPath);
    saveSkill(skill, path);
    process.stderr.write(`Skill saved to ${path}\n`);
  }

  const output = `${renderTable(rows, skill, { includeHeader: options.includeHeader })}\n`;
  if (options.outPath) {
    writeFileSync(options.outPath, output, 'utf8');
  } else {
    process.stdout.write(output);
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`Error: ${message}\n`);
  process.exitCode = 1;
});
