import type { KeyActivityRecord } from './activity';

export function keyActivityCsv(records: KeyActivityRecord[]) {
  const cell = (value: unknown) => {
    const text = String(value ?? '');
    const safe = /^[\s]*[=+\-@]/.test(text) ? `'${text}` : text;
    return `"${safe.replace(/"/g, '""')}"`;
  };
  return [
    ['ID', 'Timestamp', 'Key ID', 'Key name', 'Model', 'Input tokens', 'Cached input tokens', 'Output tokens', 'Cost USD'],
    ...records.map(record => [record.id, record.createdAt, record.keyId, record.keyName, record.model,
      record.promptTokens, record.cachedTokens, record.completionTokens, record.costUsd.toFixed(6)]),
  ].map(row => row.map(cell).join(',')).join('\r\n');
}
