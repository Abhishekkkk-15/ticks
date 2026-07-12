import fs from 'fs';

export function readJsonl(filePath: string): any[] {
  if (!fs.existsSync(filePath)) return [];
  const content = fs.readFileSync(filePath, 'utf8');
  return content
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .map(line => JSON.parse(line));
}

export function writeJsonl(filePath: string, entries: any[]): void {
  const content = entries.map(entry => JSON.stringify(entry)).join('\n') + '\n';
  fs.writeFileSync(filePath, content, 'utf8');
}
