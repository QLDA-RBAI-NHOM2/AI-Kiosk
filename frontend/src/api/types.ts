/** Contract nội bộ FE; KHÔNG phải DTO/endpoint FastAPI đã được xác nhận. */
export type VerificationStep = 'ticket' | 'identity' | 'face';
export type KioskScreen = 'welcome' | VerificationStep | 'result';
export type StepStatus = 'IDLE' | 'SCANNING' | 'PROCESSING' | 'PASSED' | 'FAILED' | 'ERROR' | 'TIMEOUT' | 'CANCELLED';
export type SessionStatus = 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
export type FinalDecision = 'PASS' | 'FAIL';
export type MockScenario = 'ALL_PASS' | 'INVALID_TICKET' | 'IDENTITY_MISMATCH' | 'FACE_MISMATCH' | 'LIVENESS_FAILED' | 'REQUEST_TIMEOUT' | 'NETWORK_ERROR' | 'SESSION_CANCELLED';
export type VerificationErrorCode = 'INVALID_TICKET' | 'IDENTITY_MISMATCH' | 'FACE_MISMATCH' | 'LIVENESS_FAILED'
  | 'REQUEST_TIMEOUT' | 'NETWORK_ERROR' | 'SESSION_CANCELLED' | 'REQUEST_CANCELLED' | 'INVALID_SESSION'
  | 'DUPLICATE_REQUEST' | 'STALE_RESPONSE' | 'STEP_NOT_ALLOWED' | 'RESULT_NOT_READY' | 'INVALID_RESPONSE' | 'UNKNOWN_ERROR'
  | 'SERVICE_UNAVAILABLE';

export interface LatencyMeasurement { name: string; valueMs: number | null | undefined }
export interface RetryGrant { allowed: boolean; target: VerificationStep | null }

export interface VerificationSession {
  sessionId: string;
  source: 'mock' | 'backend';
  currentStep: VerificationStep | 'result';
  sessionStatus: SessionStatus;
  ticketStatus: StepStatus;
  identityStatus: StepStatus;
  faceStatus: StepStatus;
  livenessStatus: StepStatus;
  finalDecision: FinalDecision | null;
  errorCode: VerificationErrorCode | null;
  latency: LatencyMeasurement[];
  createdAt: string;
  allowedNext: VerificationStep | 'result' | null;
  retry: RetryGrant;
}
export type VerificationResponse = VerificationSession;
export type StepResult = VerificationResponse;
export type FinalResult = VerificationResponse & { finalDecision: FinalDecision };
/** Không chứa frame, QR, tên hoặc định danh thật. Adapter live sẽ có input contract riêng. */
export interface VerificationInput { kind: 'mock-marker' }

export interface VerificationApi {
  createSession(signal?: AbortSignal): Promise<VerificationResponse>;
  verifyTicket(sessionId: string, input: VerificationInput, signal?: AbortSignal): Promise<StepResult>;
  verifyIdentity(sessionId: string, input: VerificationInput, signal?: AbortSignal): Promise<StepResult>;
  verifyFaceAndLiveness(sessionId: string, input: VerificationInput, signal?: AbortSignal): Promise<StepResult>;
  getSessionResult(sessionId: string, signal?: AbortSignal): Promise<FinalResult>;
  cancelSession(sessionId: string, signal?: AbortSignal): Promise<void>;
}
