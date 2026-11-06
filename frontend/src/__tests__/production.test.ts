import test from 'node:test';
import assert from 'node:assert/strict';
import { UnavailableVerificationApi } from '../api/UnavailableVerificationApi.ts';
import { VerificationController } from '../state/VerificationController.ts';
import { mapVerificationError } from '../api/errorMapping.ts';

const message = 'Hệ thống xác thực chưa được kết nối. Vui lòng liên hệ nhân viên hỗ trợ.';
const input = { kind: 'mock-marker' } as const;

test('unavailable adapter rejects all verification operations instead of fabricating sessions or decisions', async () => {
  const api = new UnavailableVerificationApi();
  const calls = [() => api.createSession(), () => api.verifyTicket('client-injected-id', input),
    () => api.verifyIdentity('client-injected-id', input), () => api.verifyFaceAndLiveness('client-injected-id', input),
    () => api.getSessionResult('client-injected-id'), () => api.cancelSession('client-injected-id')];
  for (const call of calls) await assert.rejects(call(), { code: 'SERVICE_UNAVAILABLE', message });
  assert.equal(api.availability.status, 'SERVICE_UNAVAILABLE');
  assert.equal(api.availability.message, message);
});

test('unavailable adapter keeps controller at Welcome through repeated Start, Retry, navigation and reset', async () => {
  const controller = new VerificationController(new UnavailableVerificationApi());
  for (let attempt = 0; attempt < 2; attempt++) {
    assert.equal(await controller.start(), false);
    assert.equal(controller.getSnapshot().session, null);
    assert.equal(controller.getSnapshot().request, null);
    assert.equal(controller.getSnapshot().issue?.code, 'SERVICE_UNAVAILABLE');
    assert.equal(await controller.verify(), false);
    assert.equal(await controller.next(), false);
    assert.equal(await controller.retry(), false);
    assert.equal(await controller.showResult(), false);
    controller.startOver();
  }
});

test('service unavailable is a safe technical error, never a business verification FAIL', async () => {
  try { await new UnavailableVerificationApi().createSession(); assert.fail('must reject'); }
  catch (error) {
    const issue = mapVerificationError(error);
    assert.equal(issue.category, 'technical'); assert.equal(issue.recoverable, false);
    assert.equal(issue.message, message);
    assert.doesNotMatch(issue.message, /stack|endpoint|token|localhost|MOCK/i);
  }
});
