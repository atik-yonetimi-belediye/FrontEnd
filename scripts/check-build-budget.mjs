import { readdir, readFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import path from 'node:path';

const DIST_DIR = path.resolve('dist/assets');
const KIB = 1024;
const limits = {
  maxJavaScriptFileGzip: 125 * KIB,
  totalJavaScriptGzip: 300 * KIB,
  maxCssFileGzip: 15 * KIB,
  totalCssGzip: 25 * KIB,
};

const files = await readdir(DIST_DIR);
const measured = await Promise.all(
  files
    .filter((file) => /\.(js|css)$/.test(file))
    .map(async (file) => {
      const content = await readFile(path.join(DIST_DIR, file));
      return { file, bytes: gzipSync(content).byteLength };
    }),
);

const javascript = measured.filter(({ file }) => file.endsWith('.js'));
const css = measured.filter(({ file }) => file.endsWith('.css'));
const total = (items) => items.reduce((sum, item) => sum + item.bytes, 0);
const largest = (items) => Math.max(0, ...items.map((item) => item.bytes));
const formatKib = (bytes) => `${(bytes / KIB).toFixed(1)} KiB`;

const checks = [
  ['En buyuk JavaScript parcasi', largest(javascript), limits.maxJavaScriptFileGzip],
  ['Toplam JavaScript', total(javascript), limits.totalJavaScriptGzip],
  ['En buyuk CSS parcasi', largest(css), limits.maxCssFileGzip],
  ['Toplam CSS', total(css), limits.totalCssGzip],
];

let failed = false;
for (const [label, actual, limit] of checks) {
  const passed = actual <= limit;
  failed ||= !passed;
  console.log(`${passed ? 'OK' : 'HATA'} ${label}: ${formatKib(actual)} / ${formatKib(limit)}`);
}

if (failed) {
  console.error('Production paket boyutu belirlenen performans butcesini asti.');
  process.exitCode = 1;
}
