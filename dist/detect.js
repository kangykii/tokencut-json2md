const MAX_DEPTH = 3;
function isPlainObject(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function valueType(value) {
    if (value === null)
        return 'null';
    if (Array.isArray(value))
        return 'array';
    switch (typeof value) {
        case 'string':
            return 'string';
        case 'number':
            return 'number';
        case 'boolean':
            return 'boolean';
        case 'object':
            return 'object';
        default:
            return 'null';
    }
}
function valueLength(value) {
    if (value === null || value === undefined)
        return 0;
    if (typeof value === 'string')
        return value.length;
    if (typeof value === 'number' || typeof value === 'boolean')
        return String(value).length;
    return JSON.stringify(value)?.length ?? 0;
}
function recordValue(columns, key, value) {
    const existing = columns.get(key) ??
        {
            types: new Set(),
            maxLen: 0,
            nullable: false,
            hasNonNullish: false,
        };
    if (value === null || value === undefined) {
        existing.nullable = true;
        existing.types.add('null');
    }
    else {
        existing.hasNonNullish = true;
        existing.types.add(valueType(value));
    }
    existing.maxLen = Math.max(existing.maxLen, valueLength(value));
    columns.set(key, existing);
}
function walkValue(value, path, depth, columns) {
    if (isPlainObject(value) && depth < MAX_DEPTH) {
        const entries = Object.entries(value);
        if (entries.length === 0 && path.length > 0) {
            recordValue(columns, path, value);
            return;
        }
        for (const [key, child] of entries) {
            const childPath = path.length > 0 ? `${path}.${key}` : key;
            walkValue(child, childPath, depth + 1, columns);
        }
        return;
    }
    if (path.length > 0) {
        recordValue(columns, path, value);
    }
}
function chooseType(types) {
    for (const type of types) {
        if (type !== 'null')
            return type;
    }
    return 'null';
}
export function detectSchema(rows, sampleSize = 50) {
    const columns = new Map();
    for (const row of rows.slice(0, Math.max(0, sampleSize))) {
        walkValue(row, '', 0, columns);
    }
    return [...columns.entries()]
        .filter(([, observed]) => observed.hasNonNullish)
        .map(([key, observed]) => ({
        key,
        type: chooseType(observed.types),
        maxLen: observed.maxLen,
        nullable: observed.nullable,
    }))
        .sort((a, b) => {
        const depthDiff = a.key.split('.').length - b.key.split('.').length;
        return depthDiff === 0 ? a.key.localeCompare(b.key) : depthDiff;
    });
}
