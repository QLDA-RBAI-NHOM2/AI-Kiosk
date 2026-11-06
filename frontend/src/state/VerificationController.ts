import { mapVerificationError, VerificationError } from '../api/errorMapping.ts';
import { validateResponse } from '../api/validation.ts';
import type { VerificationApi, VerificationResponse, VerificationStep } from '../api/types.ts';
import {
  canContinue, canEnterStep, canRetry, createInitialState, stepFailed, stepPassed, verificationReducer,
} from './verificationReducer.ts';
import type { RequestToken, VerificationAction, VerificationState } from './verificationReducer.ts';

/** Một owner cho request/session. Không có HTTP, dữ liệu camera hoặc luật xác thực tại đây. */
export class VerificationController {
  private state: VerificationState = createInitialState();
  private sequence = 0;
  private active: { token: RequestToken; abort: AbortController } | null = null;
  private readonly listeners = new Set<() => void>();
  private readonly api: VerificationApi;

  constructor(api: VerificationApi) { this.api = api; }
  getSnapshot = () => this.state;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };

  private dispatch(action: VerificationAction) {
    const next = verificationReducer(this.state, action);
    if (next !== this.state) { this.state = next; this.listeners.forEach((listener) => listener()); }
  }

  start = async (): Promise<boolean> => {
    if (this.active || this.state.session) return false;
    return this.request('create', undefined, (signal) => this.api.createSession(signal));
  };

  beginStep = (): boolean => {
    const step = this.state.session?.currentStep;
    if (!step || step === 'result') return false;
    const previous = this.state;
    this.dispatch({ type: 'BEGIN_STEP', step });
    return this.state !== previous;
  };

  verify = async (): Promise<boolean> => {
    const session = this.state.session;
    if (this.active || !session || session.currentStep === 'result' || this.state.issue
      || !canEnterStep(session, session.currentStep) || !['IDLE', 'SCANNING'].includes(session[`${session.currentStep}Status`])) return false;
    const step = session.currentStep;
    this.beginStep();
    const input = { kind: 'mock-marker' } as const;
    return this.request('step', step, (signal) => step === 'ticket' ? this.api.verifyTicket(session.sessionId, input, signal)
      : step === 'identity' ? this.api.verifyIdentity(session.sessionId, input, signal)
      : this.api.verifyFaceAndLiveness(session.sessionId, input, signal));
  };

  next = async (): Promise<boolean> => {
    if (this.active || !canContinue(this.state)) return false;
    if (this.state.session?.allowedNext === 'result') return this.showResult();
    this.dispatch({ type: 'NAVIGATE_NEXT' });
    return true;
  };

  retry = async (): Promise<boolean> => {
    if (this.active || !canRetry(this.state)) return false;
    if (this.state.failedOperation === 'result') return this.showResult();
    this.dispatch({ type: 'RETRY_STEP' });
    return this.verify();
  };

  showResult = async (): Promise<boolean> => {
    const session = this.state.session;
    if (this.active || !session || session.sessionStatus !== 'ACTIVE' || session.currentStep === 'result') return false;
    const eligible = stepFailed(session, session.currentStep)
      || session.currentStep === 'face' && stepPassed(session, 'face') && session.allowedNext === 'result';
    if (!eligible) return false;
    return this.request('result', undefined, (signal) => this.api.getSessionResult(session.sessionId, signal));
  };

  back = (): boolean => {
    if (this.active || this.state.session?.currentStep !== 'ticket') return false;
    this.startOver();
    return true;
  };
  cancel = () => this.reset('CANCEL_SESSION');
  startOver = () => this.reset('START_OVER');
  dispose = () => this.reset('START_OVER');

  private reset(type: 'CANCEL_SESSION' | 'START_OVER') {
    const sessionId = this.state.session?.sessionId;
    const active = this.active;
    this.active = null;
    // Vô hiệu generation trước abort/cancel (adapter có thể bỏ qua AbortSignal).
    this.dispatch({ type });
    active?.abort.abort();
    if (sessionId) void this.releaseSession(sessionId);
  }

  private async releaseSession(sessionId: string) {
    try { await this.api.cancelSession(sessionId); } catch { /* Local reset không phụ thuộc cancel ack hoặc sync throw. */ }
  }

  private async request(kind: RequestToken['kind'], step: VerificationStep | undefined,
    operation: (signal: AbortSignal) => Promise<VerificationResponse>): Promise<boolean> {
    const token: RequestToken = { id: ++this.sequence, generation: this.state.generation, kind, step };
    const active = { token, abort: new AbortController() };
    const previous = this.state.session;
    this.active = active; // Khóa đồng bộ trước dispatch hoặc await để chặn double click cùng tick.
    this.dispatch({ type: kind === 'create' ? 'START_SESSION' : kind === 'step' ? 'PROCESS_STEP' : 'REQUEST_RESULT', token });
    let response: VerificationResponse | undefined;
    try {
      response = await operation(active.abort.signal);
      if (this.active !== active || this.state.generation !== token.generation) {
        if (kind === 'create' && response?.sessionId) void this.releaseSession(response.sessionId);
        return false;
      }
      validateResponse(response, previous?.sessionId);
      if (previous && (response.source !== previous.source || response.createdAt !== previous.createdAt)) throw new VerificationError('INVALID_RESPONSE');
      if (kind === 'create' && (response.currentStep !== 'ticket' || response.sessionStatus !== 'ACTIVE'
        || response.finalDecision !== null || response.ticketStatus !== 'IDLE' || response.identityStatus !== 'IDLE'
        || response.faceStatus !== 'IDLE' || response.livenessStatus !== 'IDLE' || response.errorCode !== null
        || response.allowedNext !== null || response.retry.allowed)) throw new VerificationError('INVALID_RESPONSE');
      if (kind === 'step' && (response.currentStep !== step || response.finalDecision !== null)) throw new VerificationError('INVALID_RESPONSE');
      if (kind === 'step' && response.sessionStatus !== 'CANCELLED') {
        if (response.sessionStatus !== 'ACTIVE'
          || step !== 'ticket' && response.ticketStatus !== previous?.ticketStatus
          || step === 'face' && response.identityStatus !== previous?.identityStatus
          || step === 'ticket' && response.identityStatus !== 'IDLE'
          || step !== 'face' && (response.faceStatus !== 'IDLE' || response.livenessStatus !== 'IDLE')) {
          throw new VerificationError('INVALID_RESPONSE');
        }
      }
      if (kind === 'result' && (response.finalDecision === null || response.currentStep !== 'result'
        || response.sessionStatus !== 'COMPLETED')) throw new VerificationError('INVALID_RESPONSE');
      if (kind === 'step' && response.sessionStatus !== 'CANCELLED' && step
        && !stepPassed(response, step) && !stepFailed(response, step)) throw new VerificationError('INVALID_RESPONSE');
      this.dispatch({ type: kind === 'create' ? 'SESSION_CREATED' : kind === 'result' ? 'SET_FINAL_RESULT'
        : response.sessionStatus === 'CANCELLED' ? 'SESSION_CANCELLED' : step && stepFailed(response, step) ? 'STEP_FAILED' : 'STEP_PASSED', token, session: response });
      return true;
    } catch (error) {
      if (kind === 'create' && response && typeof response.sessionId === 'string' && response.sessionId) void this.releaseSession(response.sessionId);
      if (this.active !== active || this.state.generation !== token.generation) return false;
      const issue = mapVerificationError(error);
      this.dispatch({ type: issue.code === 'REQUEST_TIMEOUT' ? 'STEP_TIMEOUT' : kind === 'step' ? 'STEP_ERROR' : 'SESSION_ERROR', token, issue });
      return false;
    } finally {
      if (this.active === active) this.active = null;
    }
  }
}
