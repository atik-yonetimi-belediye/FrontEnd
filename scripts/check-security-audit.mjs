import { spawnSync } from 'node:child_process';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const ALLOWED_ADVISORY = 'GHSA-qwww-vcr4-c8h2';
const ALLOWED_PACKAGES = new Set(['react-router', 'react-router-dom']);

async function collectSourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await collectSourceFiles(entryPath));
    else if (/\.(js|jsx|ts|tsx)$/.test(entry.name)) files.push(entryPath);
  }
  return files;
}

const audit = spawnSync(
  'npm',
  ['audit', '--omit=dev', '--json'],
  { encoding: 'utf8', shell: process.platform === 'win32' },
);

if (audit.error || !audit.stdout?.trim()) {
  console.error(audit.error?.message || audit.stderr || 'npm audit çalıştırılamadı.');
  process.exit(1);
}

let report;
try {
  report = JSON.parse(audit.stdout || '{}');
} catch {
  console.error(audit.stderr || 'npm audit JSON ciktisi okunamadi.');
  process.exit(1);
}

const vulnerabilities = report.vulnerabilities || {};
const entries = Object.entries(vulnerabilities);
if (entries.length === 0) {
  console.log('Production bagimliliklarinda bilinen guvenlik bulgusu yok.');
  process.exit(0);
}

const packageNamesAllowed = entries.every(([name]) => ALLOWED_PACKAGES.has(name));
const advisoryPresent = entries.some(([, vulnerability]) =>
  vulnerability.via?.some((item) =>
    typeof item === 'object' && item.url?.endsWith(ALLOWED_ADVISORY),
  ),
);
const criticalPresent = entries.some(([, vulnerability]) => vulnerability.severity === 'critical');

const sourceFiles = await collectSourceFiles(path.resolve('src'));
const source = (await Promise.all(sourceFiles.map((file) => readFile(file, 'utf8')))).join('\n');
const usesRscApi = /unstable_.*RSC|RSCStaticRouter|createCallServer|react-server-dom/.test(source);

if (!packageNamesAllowed || !advisoryPresent || criticalPresent || usesRscApi) {
  console.error('Izin verilen RSC-disindaki yeni veya kritik bir guvenlik bulgusu tespit edildi.');
  console.error(JSON.stringify(report.metadata?.vulnerabilities || {}, null, 2));
  process.exit(1);
}

console.warn(
  `${ALLOWED_ADVISORY} yalnizca kullanilmayan deneysel RSC API yolunu etkiliyor; ` +
  'paket yayimlandiginda duzeltilmis surume gecis SECURITY.md uzerinden takip ediliyor.',
);
