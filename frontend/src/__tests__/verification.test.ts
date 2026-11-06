import test from 'node:test';
import assert from 'node:assert/strict';
import { MockVerificationApi } from '../mocks/handlers.ts';
import { mapLatency } from '../api/latencyMapping.ts';
import { issueForCode, mapVerificationError, VerificationError } from '../api/errorMapping.ts';
import type { MockScenario, VerificationApi, VerificationResponse } from '../api/types.ts';
import { VerificationController } from '../state/VerificationController.ts';
import { createInitialState, verificationReducer } from '../state/verificationReducer.ts';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import LatencyPanel from '../components/LatencyPanel.tsx';
import { finalReasonForCode } from '../api/errorMapping.ts';

const input = { kind: 'mock-marker' } as const;
const apiFor = (scenario: MockScenario = 'ALL_PASS') => new MockVerificationApi({ scenario, delayMs: 0 });

test('createSession returns an isolated MOCK session without final decision or personal data', async () => {
  const api = apiFor();
  const first = await api.createSession();
  const second = await api.createSession();
  assert.notEqual(first.sessionId, second.sessionId);
  assert.equal(first.source, 'mock');
  assert.equal(first.ticketStatus, 'IDLE');
  assert.equal(first.sessionStatus, 'ACTIVE');
  assert.equal(first.finalDecision, null);
  assert.equal(first.allowedNext, null);
  first.ticketStatus = 'PASSED';
  await assert.rejects(api.verifyIdentity(first.sessionId, input), { code: 'STEP_NOT_ALLOWED' });
});

test('mock guards require Ticket and Identity before Face and reject premature final result', async () => {
  const api = apiFor();
  const { sessionId } = await api.createSession();
  await assert.rejects(api.verifyFaceAndLiveness(sessionId, input), { code: 'STEP_NOT_ALLOWED' });
  await assert.rejects(api.getSessionResult(sessionId), { code: 'RESULT_NOT_READY' });
  const ticket = await api.verifyTicket(sessionId, input);
  assert.equal(ticket.ticketStatus, 'PASSED');
  assert.equal(ticket.finalDecision, null);
  await assert.rejects(api.verifyFaceAndLiveness(sessionId, input), { code: 'STEP_NOT_ALLOWED' });
});

test('ALL_PASS has no final PASS until the result operation returns a decision', async () => {
  const api = apiFor();
  const { sessionId } = await api.createSession();
  await api.verifyTicket(sessionId, input);
  await api.verifyIdentity(sessionId, input);
  const face = await api.verifyFaceAndLiveness(sessionId, input);
  assert.equal(face.faceStatus, 'PASSED');
  assert.equal(face.livenessStatus, 'PASSED');
  assert.equal(face.finalDecision, null);
  const result = await api.getSessionResult(sessionId);
  assert.equal(result.finalDecision, 'PASS');
  assert.equal(result.sessionStatus, 'COMPLETED');
  assert.equal(result.source, 'mock');
});

for (const [scenario, target, code] of [
  ['INVALID_TICKET', 'ticket', 'INVALID_TICKET'],
  ['IDENTITY_MISMATCH', 'identity', 'IDENTITY_MISMATCH'],
  ['FACE_MISMATCH', 'face', 'FACE_MISMATCH'],
  ['LIVENESS_FAILED', 'face', 'LIVENESS_FAILED'],
] as const) {
  test(`${scenario} blocks downstream and only adapter finalizes FAIL`, async () => {
    const api = apiFor(scenario);
    const { sessionId } = await api.createSession();
    let response = await api.verifyTicket(sessionId, input);
    if (target !== 'ticket') response = await api.verifyIdentity(sessionId, input);
    if (target === 'face') response = await api.verifyFaceAndLiveness(sessionId, input);
    assert.equal(response.finalDecision, null);
    assert.equal(response.errorCode, code);
    assert.equal(response.allowedNext, null);
    assert.equal(response.retry.target, target);
    if (target === 'ticket') await assert.rejects(api.verifyIdentity(sessionId, input), { code: 'STEP_NOT_ALLOWED' });
    if (target === 'identity') await assert.rejects(api.verifyFaceAndLiveness(sessionId, input), { code: 'STEP_NOT_ALLOWED' });
    if (scenario === 'LIVENESS_FAILED') {
      assert.equal(response.faceStatus, 'PASSED');
      assert.equal(response.livenessStatus, 'FAILED');
    }
    const result = await api.getSessionResult(sessionId);
    assert.equal(result.finalDecision, 'FAIL');
    assert.equal(result.errorCode, code);
    assert.equal(result.retry.allowed, false);
  });
}

for (const scenario of ['REQUEST_TIMEOUT', 'NETWORK_ERROR'] as const) {
  test(`${scenario} is technical failure, never a final verification FAIL`, async () => {
    const api = apiFor(scenario);
    const { sessionId } = await api.createSession();
    await assert.rejects(api.verifyTicket(sessionId, input), { code: scenario });
    await assert.rejects(api.getSessionResult(sessionId), { code: 'RESULT_NOT_READY' });
  });
}

test('SESSION_CANCELLED and explicit cancellation reject further verification', async () => {
  const api = apiFor('SESSION_CANCELLED');
  const { sessionId } = await api.createSession();
  const cancelled = await api.verifyTicket(sessionId, input);
  assert.equal(cancelled.sessionStatus, 'CANCELLED');
  assert.equal(cancelled.finalDecision, null);
  await assert.rejects(api.verifyTicket(sessionId, input), { code: 'SESSION_CANCELLED' });
  const other = apiFor();
  const session = await other.createSession();
  await other.cancelSession(session.sessionId);
  await assert.rejects(other.verifyTicket(session.sessionId, input), { code: 'INVALID_SESSION' });
});

test('AbortSignal cancels in-flight work before session mutation and clears duplicate lock', async () => {
  const api = new MockVerificationApi({ delayMs: 10 });
  const { sessionId } = await api.createSession();
  const abort = new AbortController();
  const pending = api.verifyTicket(sessionId, input, abort.signal);
  await assert.rejects(api.verifyTicket(sessionId, input), { code: 'DUPLICATE_REQUEST' });
  abort.abort();
  await assert.rejects(pending, { code: 'REQUEST_CANCELLED' });
  await assert.rejects(api.verifyIdentity(sessionId, input), { code: 'STEP_NOT_ALLOWED' });
  assert.equal((await api.verifyTicket(sessionId, input)).ticketStatus, 'PASSED');
});

test('invalid sessions and unknown errors produce safe Vietnamese messages', async () => {
  await assert.rejects(apiFor().verifyTicket('missing-session', input), { code: 'INVALID_SESSION' });
  const mapped = mapVerificationError(new Error('secret stack or QR payload'));
  assert.equal(mapped.code, 'UNKNOWN_ERROR');
  assert.equal(mapped.category, 'technical');
  assert.ok(!mapped.message.includes('secret'));
});

test('latency mapping preserves 0, null, undefined and invalid without computing total', () => {
  const metrics = mapLatency([
    { name: 'qr_ticket_ms', valueMs: 0 }, { name: 'total_ms', valueMs: null },
    { name: 'missing_demo_ms', valueMs: undefined }, { name: 'invalid_demo_ms', valueMs: -1 },
    { name: 'nan_demo_ms', valueMs: NaN },
  ]);
  assert.deepEqual(metrics.map((m) => m.valueMs), [0, null, undefined, -1, NaN]);
  assert.equal(metrics.length, 5);
  assert.equal(metrics[1]?.id, 'total_ms');
});

// Controller integration tests below exercise the same real adapter as the UI.
// Test doubles are reserved for adapters that deliberately ignore cancellation.
const controllerFor = (scenario: MockScenario = 'ALL_PASS') => new VerificationController(apiFor(scenario));

test('controller creates one session and blocks identity navigation until adapter passes Ticket', async () => {
  const controller = controllerFor();
  assert.equal(await controller.next(), false);
  await controller.start();
  assert.equal(controller.getSnapshot().session?.currentStep, 'ticket');
  assert.equal(await controller.next(), false);
  await controller.verify();
  assert.equal(await controller.next(), true);
  assert.equal(controller.getSnapshot().session?.currentStep, 'identity');
  assert.equal(controller.back(), false);
  assert.equal(await controller.next(), false);
  await controller.verify();
  await controller.next();
  assert.equal(controller.getSnapshot().session?.currentStep, 'face');
  assert.equal(await controller.next(), false);
  await controller.verify();
  assert.equal(controller.getSnapshot().session?.finalDecision, null);
  await controller.next();
  assert.equal(controller.getSnapshot().session?.currentStep, 'result');
  assert.equal(controller.getSnapshot().session?.finalDecision, 'PASS');
});

test('controller prevents duplicate start and verify synchronously', async () => {
  const controller = new VerificationController(new MockVerificationApi({ delayMs: 10 }));
  const starting = controller.start();
  assert.equal(await controller.start(), false);
  assert.notEqual(controller.getSnapshot().request, null);
  await starting;
  const pending = controller.verify();
  assert.equal(await controller.verify(), false);
  assert.equal(controller.getSnapshot().session?.ticketStatus, 'PROCESSING');
  await pending;
  assert.equal(controller.getSnapshot().session?.ticketStatus, 'PASSED');
});

for (const [scenario, expected] of [
  ['INVALID_TICKET', 'FAILED'], ['IDENTITY_MISMATCH', 'FAILED'], ['FACE_MISMATCH', 'FAILED'],
  ['LIVENESS_FAILED', 'FAILED'], ['REQUEST_TIMEOUT', 'TIMEOUT'], ['NETWORK_ERROR', 'ERROR'],
] as const) {
  test(`controller ${scenario} keeps Continue guarded and supports a clean Retry`, async () => {
    const controller = controllerFor(scenario);
    await controller.start();
    await controller.verify();
    if (scenario === 'IDENTITY_MISMATCH' || scenario === 'FACE_MISMATCH' || scenario === 'LIVENESS_FAILED') {
      await controller.next(); await controller.verify();
    }
    if (scenario === 'FACE_MISMATCH' || scenario === 'LIVENESS_FAILED') { await controller.next(); await controller.verify(); }
    const state = controller.getSnapshot();
    const statuses = [state.session?.ticketStatus, state.session?.identityStatus, state.session?.faceStatus, state.session?.livenessStatus];
    assert.ok(statuses.includes(expected));
    assert.equal(state.session?.finalDecision, null);
    assert.equal(state.issue?.category, expected === 'FAILED' ? 'business' : 'technical');
    assert.equal(await controller.next(), false);
    const retrying = controller.retry();
    const retryState = controller.getSnapshot();
    assert.equal(retryState.issue, null);
    assert.deepEqual(retryState.session?.latency, []);
    assert.equal(retryState.session?.finalDecision, null);
    await retrying;
    assert.equal(controller.getSnapshot().issue?.code, scenario);
    if (expected === 'FAILED') {
      await controller.showResult();
      assert.equal(controller.getSnapshot().session?.finalDecision, 'FAIL');
      assert.equal(await controller.retry(), false);
    } else assert.equal(await controller.showResult(), false);
  });
}

test('server cancellation disables all further operations until Start Over', async () => {
  const controller = controllerFor('SESSION_CANCELLED');
  await controller.start(); await controller.verify();
  assert.equal(controller.getSnapshot().session?.sessionStatus, 'CANCELLED');
  assert.equal(controller.getSnapshot().issue?.category, 'cancelled');
  assert.equal(await controller.verify(), false);
  assert.equal(await controller.next(), false);
  assert.equal(await controller.retry(), false);
  controller.startOver();
  assert.equal(controller.getSnapshot().session, null);
  assert.equal(controller.getSnapshot().issue, null);
});

test('Cancel and Start Over abort pending requests, clear all session data and allow a fresh Start', async () => {
  const controller = new VerificationController(new MockVerificationApi({ delayMs: 10 }));
  await controller.start();
  const previousId = controller.getSnapshot().session?.sessionId;
  const pending = controller.verify();
  controller.cancel();
  assert.equal(controller.getSnapshot().session, null);
  assert.equal(controller.getSnapshot().issue?.code, 'REQUEST_CANCELLED');
  await pending;
  assert.equal(controller.getSnapshot().session, null);
  controller.startOver();
  assert.equal(controller.getSnapshot().issue, null);
  await controller.start();
  assert.notEqual(controller.getSnapshot().session?.sessionId, previousId);
  assert.equal(controller.getSnapshot().session?.ticketStatus, 'IDLE');
  assert.equal(controller.back(), true);
  assert.equal(controller.getSnapshot().session, null);
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

test('late createSession after Start Over is ignored and its orphaned session is cancelled', async () => {
  const api = apiFor();
  const late = deferred<VerificationResponse>();
  const originalCreate = api.createSession.bind(api);
  const orphan = await originalCreate();
  let first = true;
  api.createSession = () => { if (first) { first = false; return late.promise; } return originalCreate(); };
  const controller = new VerificationController(api);
  const pending = controller.start();
  controller.startOver();
  await controller.start();
  const currentId = controller.getSnapshot().session?.sessionId;
  late.resolve(orphan);
  await pending;
  assert.equal(controller.getSnapshot().session?.sessionId, currentId);
  await assert.rejects(api.verifyTicket(orphan.sessionId, input), { code: 'INVALID_SESSION' });
});

for (const lateError of [false, true]) {
  test(`stale step ${lateError ? 'error' : 'success'} ignoring AbortSignal cannot overwrite a new session`, async () => {
    const api = apiFor();
    const late = deferred<VerificationResponse>();
    api.verifyTicket = () => late.promise;
    const controller = new VerificationController(api);
    await controller.start();
    const previous = controller.getSnapshot().session!;
    const pending = controller.verify();
    controller.startOver(); await controller.start();
    const currentId = controller.getSnapshot().session?.sessionId;
    if (lateError) late.reject(new Error('old private payload'));
    else late.resolve({ ...previous, ticketStatus: 'PASSED', allowedNext: 'identity' });
    await pending;
    assert.equal(controller.getSnapshot().session?.sessionId, currentId);
    assert.equal(controller.getSnapshot().session?.ticketStatus, 'IDLE');
    assert.equal(controller.getSnapshot().issue, null);
  });
}

test('stale final decision cannot grant PASS after Start Over', async () => {
  const api = apiFor();
  const late = deferred<Awaited<ReturnType<VerificationApi['getSessionResult']>>>();
  const controller = new VerificationController(api);
  await controller.start(); await controller.verify(); await controller.next(); await controller.verify();
  await controller.next(); await controller.verify();
  const result = await api.getSessionResult(controller.getSnapshot().session!.sessionId);
  api.getSessionResult = () => late.promise;
  const pending = controller.next();
  assert.equal(await controller.next(), false);
  controller.startOver(); await controller.start();
  late.resolve(result); await pending;
  assert.equal(controller.getSnapshot().session?.finalDecision, null);
  assert.equal(controller.getSnapshot().session?.currentStep, 'ticket');
});

test('invalid response session is rejected without unlocking Continue', async () => {
  const api = apiFor();
  const controller = new VerificationController(api);
  await controller.start();
  const original = controller.getSnapshot().session!;
  api.verifyTicket = async () => ({ ...original, sessionId: 'wrong-session', ticketStatus: 'PASSED', allowedNext: 'identity' });
  await controller.verify();
  assert.equal(controller.getSnapshot().issue?.code, 'INVALID_RESPONSE');
  assert.equal(controller.getSnapshot().session?.finalDecision, null);
  assert.equal(await controller.next(), false);
});

test('reducer refuses arbitrary STEP_PASSED and SET_FINAL_RESULT without a matching request', async () => {
  const state = createInitialState();
  const session = await apiFor().createSession();
  const token = { id: 1, generation: 0, kind: 'step' as const, step: 'ticket' as const };
  assert.equal(verificationReducer(state, { type: 'STEP_PASSED', token, session: { ...session, ticketStatus: 'PASSED' } }), state);
  assert.equal(verificationReducer(state, { type: 'SET_FINAL_RESULT', token: { ...token, kind: 'result' },
    session: { ...session, finalDecision: 'PASS', currentStep: 'result', sessionStatus: 'COMPLETED' } }), state);
  assert.equal(verificationReducer(state, { type: 'NAVIGATE_NEXT' }), state);
  assert.equal(verificationReducer(state, { type: 'BEGIN_STEP', step: 'identity' }), state);
});

test('retry invalidates all dependent statuses and never reuses an old final decision or latency', async () => {
  const session = await apiFor().createSession();
  const state = {
    ...createInitialState(),
    session: { ...session, ticketStatus: 'FAILED' as const, identityStatus: 'PASSED' as const, faceStatus: 'PASSED' as const,
      livenessStatus: 'PASSED' as const, latency: [{ name: 'total_ms', valueMs: 999 }],
      retry: { allowed: true, target: 'ticket' as const } },
    issue: issueForCode('INVALID_TICKET'),
  };
  const next = verificationReducer(state, { type: 'RETRY_STEP' });
  assert.equal(next.session?.ticketStatus, 'IDLE');
  assert.equal(next.session?.identityStatus, 'IDLE');
  assert.equal(next.session?.faceStatus, 'IDLE');
  assert.equal(next.session?.livenessStatus, 'IDLE');
  assert.deepEqual(next.session?.latency, []);
  assert.equal(next.issue, null);
});

for (const [label, mutate] of [
  ['unknown error code', (session: VerificationResponse) => ({ ...session, errorCode: 'UNRECOGNIZED_PRIVATE_DETAIL' })],
  ['malformed latency', (session: VerificationResponse) => ({ ...session, latency: [null] })],
  ['unknown retry target', (session: VerificationResponse) => ({ ...session, retry: { allowed: true, target: 'unknown' } })],
  ['unknown next step', (session: VerificationResponse) => ({ ...session, allowedNext: 'unknown' })],
  ['preloaded identity', (session: VerificationResponse) => ({ ...session, identityStatus: 'PASSED' })],
] as const) {
  test(`malformed adapter snapshot (${label}) is rejected without crashing the passenger UI`, async () => {
    const api = apiFor();
    const response = mutate(await api.createSession()) as VerificationResponse;
    api.createSession = async () => response;
    const controller = new VerificationController(api);
    await controller.start();
    assert.equal(controller.getSnapshot().session, null);
    assert.equal(controller.getSnapshot().issue?.code, 'INVALID_RESPONSE');
  });
}

test('start failure and retry keep Welcome and never leave a request lock behind', async () => {
  const api = apiFor();
  const original = api.createSession.bind(api);
  api.createSession = async () => { throw new VerificationError('NETWORK_ERROR'); };
  const controller = new VerificationController(api);
  await controller.start();
  assert.equal(controller.getSnapshot().request, null);
  assert.equal(controller.getSnapshot().session, null);
  assert.equal(controller.getSnapshot().issue?.code, 'NETWORK_ERROR');
  api.createSession = original;
  assert.equal(await controller.start(), true);
  assert.equal(controller.getSnapshot().issue, null);
});

test('step response cannot preload Identity or downstream statuses', async () => {
  const api = apiFor();
  const original = api.verifyTicket.bind(api);
  api.verifyTicket = async (...args) => ({ ...await original(...args), identityStatus: 'PASSED' });
  const controller = new VerificationController(api);
  await controller.start(); await controller.verify();
  assert.equal(controller.getSnapshot().issue?.code, 'INVALID_RESPONSE');
  assert.equal(controller.getSnapshot().session?.identityStatus, 'IDLE');
  assert.equal(await controller.next(), false);
});

for (const changed of ['source', 'createdAt'] as const) {
  test(`session ${changed} is immutable across final result responses`, async () => {
    const api = apiFor();
    const original = api.getSessionResult.bind(api);
    api.getSessionResult = async (...args) => ({ ...await original(...args), [changed]: changed === 'source' ? 'backend' : 'different-date' });
    const controller = new VerificationController(api);
    await controller.start(); await controller.verify(); await controller.next(); await controller.verify();
    await controller.next(); await controller.verify(); await controller.next();
    assert.equal(controller.getSnapshot().session?.source, 'mock');
    assert.equal(controller.getSnapshot().session?.finalDecision, null);
    assert.equal(controller.getSnapshot().issue?.code, 'INVALID_RESPONSE');
  });
}

test('Retry after lost final response reads the stored result without re-running Face', async () => {
  const api = apiFor();
  let resultCalls = 0; let faceCalls = 0;
  const originalResult = api.getSessionResult.bind(api);
  const originalFace = api.verifyFaceAndLiveness.bind(api);
  api.getSessionResult = async (...args) => {
    const response = await originalResult(...args);
    if (++resultCalls === 1) throw new VerificationError('NETWORK_ERROR');
    return response;
  };
  api.verifyFaceAndLiveness = (...args) => { faceCalls++; return originalFace(...args); };
  const controller = new VerificationController(api);
  await controller.start(); await controller.verify(); await controller.next(); await controller.verify();
  await controller.next(); await controller.verify(); await controller.next();
  assert.equal(controller.getSnapshot().issue?.code, 'NETWORK_ERROR');
  assert.equal(controller.getSnapshot().session?.finalDecision, null);
  await controller.retry();
  assert.equal(controller.getSnapshot().session?.finalDecision, 'PASS');
  assert.equal(faceCalls, 1);
  assert.equal(resultCalls, 2);
});

test('best-effort cancel handles synchronous throws without escaping reset or late creation', async () => {
  const api = apiFor();
  api.cancelSession = () => { throw new Error('private cancellation failure'); };
  const controller = new VerificationController(api);
  await controller.start();
  assert.doesNotThrow(() => controller.startOver());
  assert.equal(controller.getSnapshot().session, null);
});

test('rejected create snapshot with allocated session is released best-effort', async () => {
  const api = apiFor();
  const snapshot = await api.createSession();
  api.createSession = async () => ({ ...snapshot, ticketStatus: 'PASSED' });
  const controller = new VerificationController(api);
  await controller.start();
  assert.equal(controller.getSnapshot().issue?.code, 'INVALID_RESPONSE');
  await assert.rejects(api.verifyTicket(snapshot.sessionId, input), { code: 'INVALID_SESSION' });
});

test('LatencyPanel distinguishes zero, null, undefined and invalid values for Technical Mode', () => {
  const html = renderToStaticMarkup(createElement(LatencyPanel, { defaultOpen: true, demo: true, metrics: [
    { id: 'zero', label: 'zero', valueMs: 0 }, { id: 'null', label: 'null', valueMs: null },
    { id: 'missing', label: 'missing', valueMs: undefined }, { id: 'invalid', label: 'invalid', valueMs: -1 },
  ] }));
  assert.match(html, /0 <span class="metric-unit">ms<\/span>/);
  assert.match(html, /Chưa có số đo/);
  assert.match(html, /Chưa được cung cấp/);
  assert.match(html, /Không hợp lệ/);
});

test('terminal FAIL reasons do not direct passengers to step-only Retry actions', () => {
  for (const code of ['INVALID_TICKET', 'IDENTITY_MISMATCH', 'FACE_MISMATCH', 'LIVENESS_FAILED'] as const) {
    const message = finalReasonForCode(code);
    assert.ok(message.length > 0);
    assert.doesNotMatch(message, /thử lại|xem kết quả/i);
  }
});
