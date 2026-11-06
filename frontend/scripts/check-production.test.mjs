import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import { fileURLToPath, URL } from 'node:url';
import { spawnSync } from 'node:child_process';
import process from 'node:process';

const script = fileURLToPath(new URL('./check-production.mjs', import.meta.url));
const unavailable = "const status='SERVICE_UNAVAILABLE'; const message='Hệ thống xác thực chưa được kết nối.';";
async function artifact(files, check) {
  const directory = await mkdtemp(join(tmpdir(), 'kiosk-production-check-'));
  try {
    await mkdir(join(directory, 'assets'));
    for (const [name, contents] of Object.entries(files)) await writeFile(join(directory, name), contents);
    await check(spawnSync(process.execPath, [script, directory], { encoding: 'utf8' }));
  } finally {
    // Chỉ xóa fixture do test vừa tạo, nằm trong temp directory đã xác định.
    assert.ok(resolve(directory).startsWith(`${resolve(tmpdir())}${sep}kiosk-production-check-`));
    await rm(directory, { recursive: true, force: true });
  }
}

test('production check accepts an HTML entry pointing at a fail-closed bundle', async () => {
  await artifact({ 'index.html': '<script type="module" src="/assets/entry.js"></script>', 'assets/entry.js': unavailable }, (result) => {
    assert.equal(result.status, 0, result.stderr);
  });
});
test('production check rejects missing referenced entry despite unrelated valid JS', async () => {
  await artifact({ 'index.html': '<script type="module" src="/assets/missing.js"></script>', 'assets/stale.js': unavailable }, (result) => {
    assert.notEqual(result.status, 0);
  });
});
test('production check rejects entry without fail-closed state despite unrelated valid JS', async () => {
  await artifact({ 'index.html': '<script type="module" src="/assets/entry.js"></script>', 'assets/entry.js': 'void 0;', 'assets/stale.js': unavailable }, (result) => {
    assert.notEqual(result.status, 0);
  });
});
test('production check rejects mock workflow even beside a valid fail-closed entry', async () => {
  await artifact({ 'index.html': '<script type="module" src="/assets/entry.js"></script>', 'assets/entry.js': unavailable, 'assets/stale.js': "const scenario='ALL_PASS';" }, (result) => {
    assert.notEqual(result.status, 0);
  });
});
