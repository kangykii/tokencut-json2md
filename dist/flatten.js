function isRecord(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function resolvePath(row, key, separator) {
    let current = row;
    for (const part of key.split(separator)) {
        if (!isRecord(current) || !(part in current)) {
            return undefined;
        }
        current = current[part];
    }
    return current;
}
function truncateValue(value, maxChars) {
    if (value.length <= maxChars)
        return value;
    if (maxChars === 0)
        return '…';
    return `${value.slice(0, maxChars)}…`;
}
function stringifyArrayItem(value) {
    if (value === null || value === undefined)
        return '';
    if (typeof value === 'string')
        return value;
    if (typeof value === 'number' || typeof value === 'boolean')
        return String(value);
    return JSON.stringify(value) ?? '';
}
function formatValue(value, column, skill) {
    if (value === null || value === undefined)
        return '';
    const truncate = column.truncate ?? 120;
    if (typeof value === 'boolean')
        return value ? 'true' : 'false';
    if (typeof value === 'number')
        return String(value);
    if (typeof value === 'string')
        return truncateValue(value, truncate);
    if (Array.isArray(value)) {
        const maxItems = Math.max(0, skill.flatten.arrayMaxItems);
        const shown = value.slice(0, maxItems).map(stringifyArrayItem).join(skill.flatten.arrayJoin);
        const hiddenCount = value.length - maxItems;
        const suffix = hiddenCount > 0 ? ` [+${hiddenCount} more]` : '';
        return truncateValue(`${shown}${suffix}`, truncate);
    }
    return truncateValue(JSON.stringify(value) ?? '', truncate);
}
export function flattenRow(row, skill) {
    const result = {};
    for (const column of skill.columns) {
        if (column.include === false)
            continue;
        const label = column.label ?? column.key;
        const value = resolvePath(row, column.key, skill.flatten.separator);
        result[label] = formatValue(value, column, skill);
    }
    return result;
}
