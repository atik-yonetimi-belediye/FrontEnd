import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

async function collect(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await collect(entryPath));
    else if (/\.(jsx|tsx)$/.test(entry.name)) files.push(entryPath);
  }
  return files;
}

const files = await collect(path.resolve('src'));
const violations = [];

for (const file of files) {
  const source = await readFile(file, 'utf8');
  const checks = [
    {
      name: 'İç içe etkileşimli öğe',
      pattern: /<(?:Link|a)\b[^>]*>\s*<(?:Button|button)\b/g,
    },
    {
      name: 'Etiketsiz görsel buton',
      pattern: /<button\b(?![^>]*(?:aria-label|title))[^>]*>\s*<(?:X|Trash2|Eye|EyeOff|Menu|Sun|Moon)\b/g,
    },
  ];

  for (const check of checks) {
    if (check.pattern.test(source)) violations.push(`${path.relative('.', file)}: ${check.name}`);
  }
}

if (violations.length > 0) {
  console.error(violations.join('\n'));
  process.exit(1);
}

console.log(`${files.length} arayüz dosyasında temel erişilebilirlik kaynak kontrolü geçti.`);
