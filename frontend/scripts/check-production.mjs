import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { URL, pathToFileURL, fileURLToPath } from 'node:url';
import { resolve, sep } from 'node:path';
import process from 'node:process';
import { log } from 'node:console';

// Kiểm tra artifact thực, không chỉ import.meta.env hay source code.
const dist = process.argv[2] ? pathToFileURL(`${resolve(process.argv[2])}${sep}`) : new URL('../dist/', import.meta.url);
const html = await readFile(new URL('index.html', dist), 'utf8');
const sources = [...html.matchAll(/<script\b(?=[^>]*\btype\s*=\s*["']module["'])[^>]*\bsrc\s*=\s*["']([^"']+)["'][^>]*>/gi)].map((match) => match[1]);
assert.ok(sources.length > 0, 'index.html phải trỏ tới module entry đã build.');
const entryCode = (await Promise.all(sources.map(async (source) => {
  assert.ok(!/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(source), 'Module entry phải là artifact cục bộ.');
  const entry = new URL(source.replace(/^\/+/, ''), dist);
  assert.ok(resolve(fileURLToPath(entry)).startsWith(`${resolve(fileURLToPath(dist))}${sep}`), 'Module entry phải nằm trong dist.');
  return readFile(entry, 'utf8');
}))).join('\n');
const assets = new URL('assets/', dist);
const entries = await readdir(assets, { recursive: true });
const js = (await Promise.all(entries.filter((name) => name.endsWith('.js')).map((name) => readFile(new URL(name, assets), 'utf8')))).join('\n');
assert.ok(js.length > 0, 'Chạy npm run build trước khi kiểm production.');
for (const marker of ['MockVerificationApi', 'ALL_PASS', 'Mock scenario', 'DevelopmentControls', 'ComponentPreview', 'DEMO_PRIVATE_CODE', 'getUserMedia', 'Mock Scan / Verify']) {
  assert.ok(!js.includes(marker), `Production còn chứa development/session/camera runtime: ${marker}`);
}
assert.ok(entryCode.includes('SERVICE_UNAVAILABLE'), 'Entry production phải có trạng thái từ chối khi chưa có Backend.');
assert.ok(entryCode.includes('Hệ thống xác thực chưa được kết nối.'), 'Entry thiếu hướng dẫn dịch vụ chưa kết nối.');
log('PASS production artifact: SERVICE_UNAVAILABLE; no MOCK workflow, gallery, debug controls or camera acquisition.');
