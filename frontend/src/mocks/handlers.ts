import { VerificationError } from '../api/errorMapping.ts';
import type {
  FinalResult, MockScenario, VerificationApi, VerificationInput, VerificationResponse,
  VerificationSession, VerificationStep,
} from '../api/types.ts';

export interface MockVerificationOptions { scenario?: MockScenario; delayMs?: number }

/** Delay giả lập có kiểm soát, không phải số đo request/module. */
function waitForMock(delayMs: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) { reject(new VerificationError('REQUEST_CANCELLED')); return; }
    const onAbort = () => { clearTimeout(timer); reject(new VerificationError('REQUEST_CANCELLED')); };
    const timer = setTimeout(() => { signal?.removeEventListener('abort', onAbort); resolve(); }, delayMs);
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

function resetFrom(session: VerificationSession, step: VerificationStep) {
  session.finalDecision = null;
  session.errorCode = null;
  session.allowedNext = null;
  session.retry = { allowed: false, target: null };
  session.latency = [];
  session.currentStep = step;
  if (step === 'ticket') session.ticketStatus = 'IDLE';
  if (step !== 'face') session.identityStatus = 'IDLE';
  session.faceStatus = 'IDLE';
  session.livenessStatus = 'IDLE';
}

export class MockVerificationApi implements VerificationApi {
  private readonly scenario: MockScenario;
  private readonly delayMs: number;
  private nextSession = 0;
  private readonly sessions = new Map<string, VerificationSession>();
  private readonly pending = new Set<string>();

  constructor({ scenario = 'ALL_PASS', delayMs = 600 }: MockVerificationOptions = {}) {
    this.scenario = scenario;
    this.delayMs = Number.isFinite(delayMs) ? Math.max(0, Math.min(delayMs, 5000)) : 600;
  }

  async createSession(signal?: AbortSignal): Promise<VerificationResponse> {
    await waitForMock(this.delayMs, signal);
    const session: VerificationSession = {
      sessionId: `MOCK-${++this.nextSession}`, source: 'mock', currentStep: 'ticket', sessionStatus: 'ACTIVE',
      ticketStatus: 'IDLE', identityStatus: 'IDLE', faceStatus: 'IDLE', livenessStatus: 'IDLE',
      finalDecision: null, errorCode: null, latency: [], createdAt: new Date().toISOString(),
      allowedNext: null, retry: { allowed: false, target: null },
    };
    this.sessions.set(session.sessionId, session);
    return structuredClone(session);
  }

  verifyTicket(sessionId: string, input: VerificationInput, signal?: AbortSignal) {
    return this.verify('ticket', sessionId, input, signal);
  }
  verifyIdentity(sessionId: string, input: VerificationInput, signal?: AbortSignal) {
    return this.verify('identity', sessionId, input, signal);
  }
  verifyFaceAndLiveness(sessionId: string, input: VerificationInput, signal?: AbortSignal) {
    return this.verify('face', sessionId, input, signal);
  }

  private async verify(step: VerificationStep, sessionId: string, input: VerificationInput, signal?: AbortSignal) {
    return this.withSession(sessionId, signal, (session) => {
      if (input.kind !== 'mock-marker') throw new VerificationError('INVALID_RESPONSE');
      if (step === 'identity' && session.ticketStatus !== 'PASSED'
        || step === 'face' && (session.ticketStatus !== 'PASSED' || session.identityStatus !== 'PASSED')) {
        throw new VerificationError('STEP_NOT_ALLOWED');
      }
      if (this.scenario === 'REQUEST_TIMEOUT') throw new VerificationError('REQUEST_TIMEOUT');
      if (this.scenario === 'NETWORK_ERROR') throw new VerificationError('NETWORK_ERROR');
      resetFrom(session, step);
      if (this.scenario === 'SESSION_CANCELLED') {
        session.sessionStatus = 'CANCELLED';
        session.ticketStatus = 'CANCELLED';
        session.errorCode = 'SESSION_CANCELLED';
        return structuredClone(session);
      }
      const code = step === 'ticket' && this.scenario === 'INVALID_TICKET' ? 'INVALID_TICKET'
        : step === 'identity' && this.scenario === 'IDENTITY_MISMATCH' ? 'IDENTITY_MISMATCH'
        : step === 'face' && this.scenario === 'FACE_MISMATCH' ? 'FACE_MISMATCH'
        : step === 'face' && this.scenario === 'LIVENESS_FAILED' ? 'LIVENESS_FAILED' : null;
      if (step === 'ticket') session.ticketStatus = code ? 'FAILED' : 'PASSED';
      if (step === 'identity') session.identityStatus = code ? 'FAILED' : 'PASSED';
      if (step === 'face') {
        session.faceStatus = code === 'FACE_MISMATCH' ? 'FAILED' : 'PASSED';
        session.livenessStatus = code === 'LIVENESS_FAILED' ? 'FAILED' : 'PASSED';
      }
      session.errorCode = code;
      session.retry = { allowed: code !== null, target: code ? step : null };
      session.allowedNext = code ? null : step === 'ticket' ? 'identity' : step === 'identity' ? 'face' : 'result';
      // Chỉ fixture DEMO của các tên có nguồn tài liệu, không phải schema 7 trường chính thức.
      session.latency = [{ name: 'qr_ticket_ms', valueMs: 0 }, { name: 'total_ms', valueMs: null }];
      return structuredClone(session);
    });
  }

  async getSessionResult(sessionId: string, signal?: AbortSignal): Promise<FinalResult> {
    return this.withSession(sessionId, signal, (session) => {
      if (session.sessionStatus === 'COMPLETED' && session.finalDecision !== null) {
        return { ...structuredClone(session), finalDecision: session.finalDecision };
      }
      const failed = [session.ticketStatus, session.identityStatus, session.faceStatus, session.livenessStatus].includes('FAILED');
      const passed = session.ticketStatus === 'PASSED' && session.identityStatus === 'PASSED'
        && session.faceStatus === 'PASSED' && session.livenessStatus === 'PASSED';
      if (!failed && !passed) throw new VerificationError('RESULT_NOT_READY');
      // Quyết định của MOCK BACKEND. Không thực hiện phép tổng hợp này trong controller/page.
      const finalDecision = failed ? 'FAIL' : 'PASS';
      session.finalDecision = finalDecision;
      session.currentStep = 'result';
      session.sessionStatus = 'COMPLETED';
      session.allowedNext = null;
      session.retry = { allowed: false, target: null };
      session.latency = [{ name: 'qr_ticket_ms', valueMs: 0 }, { name: 'total_ms', valueMs: 840 }];
      return { ...structuredClone(session), finalDecision };
    }, true);
  }

  async cancelSession(sessionId: string, signal?: AbortSignal): Promise<void> {
    // Hủy mock tức thời: xóa dữ liệu trước khi request đang delay có thể ghi tiếp.
    if (signal?.aborted) throw new VerificationError('REQUEST_CANCELLED');
    this.sessions.delete(sessionId);
  }

  private async withSession<T>(sessionId: string, signal: AbortSignal | undefined, operation: (session: VerificationSession) => T, allowCompleted = false): Promise<T> {
    if (this.pending.has(sessionId)) throw new VerificationError('DUPLICATE_REQUEST');
    this.pending.add(sessionId);
    try {
      await waitForMock(this.delayMs, signal);
      const session = this.sessions.get(sessionId);
      if (!session) throw new VerificationError('INVALID_SESSION');
      if (session.sessionStatus === 'CANCELLED') throw new VerificationError('SESSION_CANCELLED');
      if (session.sessionStatus !== 'ACTIVE' && !(allowCompleted && session.sessionStatus === 'COMPLETED')) throw new VerificationError('INVALID_SESSION');
      return operation(session);
    } finally { this.pending.delete(sessionId); }
  }
}
