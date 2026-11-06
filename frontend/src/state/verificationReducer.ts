import { issueForCode } from '../api/errorMapping.ts';
import type { VerificationIssue } from '../api/errorMapping.ts';
import type { VerificationSession, VerificationStep } from '../api/types.ts';

export interface RequestToken {
  id: number;
  generation: number;
  kind: 'create' | 'step' | 'result';
  step?: VerificationStep;
}
export interface VerificationState {
  generation: number;
  session: VerificationSession | null;
  request: RequestToken | null;
  issue: VerificationIssue | null;
  failedOperation: RequestToken['kind'] | null;
}
export const createInitialState = (generation = 0): VerificationState => ({ generation, session: null, request: null, issue: null, failedOperation: null });

export function stepPassed(session: VerificationSession, step: VerificationStep): boolean {
  return step === 'ticket' ? session.ticketStatus === 'PASSED'
    : step === 'identity' ? session.identityStatus === 'PASSED'
    : session.faceStatus === 'PASSED' && session.livenessStatus === 'PASSED';
}
export function stepFailed(session: VerificationSession, step: VerificationStep): boolean {
  return step === 'ticket' ? session.ticketStatus === 'FAILED'
    : step === 'identity' ? session.identityStatus === 'FAILED'
    : session.faceStatus === 'FAILED' || session.livenessStatus === 'FAILED';
}
export function canEnterStep(session: VerificationSession, step: VerificationStep): boolean {
  return session.sessionStatus === 'ACTIVE' && session.finalDecision === null
    && (step === 'ticket' || session.ticketStatus === 'PASSED')
    && (step !== 'face' || session.identityStatus === 'PASSED');
}
export function canContinue(state: VerificationState): boolean {
  const session = state.session;
  if (!session || state.request || state.issue || session.currentStep === 'result' || !canEnterStep(session, session.currentStep)) return false;
  const next = session.currentStep === 'ticket' ? 'identity' : session.currentStep === 'identity' ? 'face' : 'result';
  return stepPassed(session, session.currentStep) && session.allowedNext === next;
}
export function canRetry(state: VerificationState): boolean {
  const { session, issue, request } = state;
  return !!(session && issue?.recoverable && !request && session.currentStep !== 'result'
    && canEnterStep(session, session.currentStep)
    && (issue.category === 'technical' || session.retry.allowed && session.retry.target === session.currentStep));
}

type ResponseEvent = { token: RequestToken; session: VerificationSession };
export type VerificationAction =
  | { type: 'START_SESSION' | 'PROCESS_STEP' | 'REQUEST_RESULT'; token: RequestToken }
  | ({ type: 'SESSION_CREATED' | 'STEP_PASSED' | 'STEP_FAILED' | 'SET_FINAL_RESULT' | 'SESSION_CANCELLED' } & ResponseEvent)
  | { type: 'STEP_ERROR' | 'STEP_TIMEOUT' | 'SESSION_ERROR'; token: RequestToken; issue: VerificationIssue }
  | { type: 'BEGIN_STEP'; step: VerificationStep }
  | { type: 'RETRY_STEP' | 'NAVIGATE_NEXT' | 'CANCEL_SESSION' | 'START_OVER' };

function matches(state: VerificationState, token: RequestToken) {
  return token.generation === state.generation && state.request?.id === token.id && state.request.kind === token.kind;
}
function withStepStatus(session: VerificationSession, step: VerificationStep, status: 'SCANNING' | 'PROCESSING' | 'ERROR' | 'TIMEOUT') {
  return { ...session, ...(step === 'ticket' ? { ticketStatus: status } : step === 'identity' ? { identityStatus: status }
    : { faceStatus: status, livenessStatus: status }) };
}

export function verificationReducer(state: VerificationState, action: VerificationAction): VerificationState {
  const session = state.session;
  switch (action.type) {
    case 'START_OVER': return createInitialState(state.generation + 1);
    case 'CANCEL_SESSION': return { ...createInitialState(state.generation + 1), issue: issueForCode('REQUEST_CANCELLED') };
    case 'START_SESSION':
      return !session && !state.request && action.token.generation === state.generation
        ? { ...state, request: action.token, issue: null, failedOperation: null } : state;
    case 'SESSION_CREATED':
      return matches(state, action.token) && !session ? { ...state, session: action.session, request: null, issue: null, failedOperation: null } : state;
    case 'BEGIN_STEP':
      if (!session || state.request || session.currentStep !== action.step || !canEnterStep(session, action.step)
        || session[`${action.step}Status`] !== 'IDLE') return state;
      return { ...state, session: withStepStatus(session, action.step, 'SCANNING') };
    case 'PROCESS_STEP': {
      const step = action.token.step;
      if (!session || !step || state.request || action.token.generation !== state.generation || session.currentStep !== step
        || !canEnterStep(session, step) || !['IDLE', 'SCANNING'].includes(session[`${step}Status`])) return state;
      return { ...state, request: action.token, issue: null, failedOperation: null, session: withStepStatus(session, step, 'PROCESSING') };
    }
    case 'REQUEST_RESULT':
      return session && !state.request && action.token.generation === state.generation
        ? { ...state, request: action.token, issue: null, failedOperation: null } : state;
    case 'STEP_PASSED':
    case 'STEP_FAILED':
    case 'SESSION_CANCELLED':
      if (!matches(state, action.token) || !session || action.session.sessionId !== session.sessionId) return state;
      return { ...state, session: action.session, request: null, failedOperation: null, issue: action.session.errorCode ? issueForCode(action.session.errorCode) : null };
    case 'SET_FINAL_RESULT':
      return matches(state, action.token) && action.token.kind === 'result' && session
        && session.sessionId === action.session.sessionId && action.session.finalDecision !== null
        ? { ...state, session: action.session, request: null, issue: null, failedOperation: null } : state;
    case 'STEP_ERROR':
    case 'STEP_TIMEOUT':
    case 'SESSION_ERROR':
      if (!matches(state, action.token)) return state;
      return { ...state, request: null, issue: action.issue, failedOperation: action.token.kind, session: session && action.token.step
        ? withStepStatus(session, action.token.step, action.type === 'STEP_TIMEOUT' ? 'TIMEOUT' : 'ERROR') : session };
    case 'RETRY_STEP': {
      if (!session || !canRetry(state) || session.currentStep === 'result') return state;
      const step = session.currentStep;
      return { ...state, issue: null, failedOperation: null, session: {
        ...session, finalDecision: null, errorCode: null, allowedNext: null, retry: { allowed: false, target: null }, latency: [],
        ...(step === 'ticket' ? { ticketStatus: 'IDLE' as const } : {}),
        ...(step !== 'face' ? { identityStatus: 'IDLE' as const } : {}),
        faceStatus: 'IDLE', livenessStatus: 'IDLE',
      } };
    }
    case 'NAVIGATE_NEXT':
      if (!session || !canContinue(state) || session.allowedNext === 'result' || !session.allowedNext) return state;
      return { ...state, session: { ...session, currentStep: session.allowedNext } };
  }
}
