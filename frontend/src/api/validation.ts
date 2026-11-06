import { isVerificationErrorCode, VerificationError } from './errorMapping.ts';
import type { VerificationResponse } from './types.ts';

const statuses = ['IDLE', 'SCANNING', 'PROCESSING', 'PASSED', 'FAILED', 'ERROR', 'TIMEOUT', 'CANCELLED'];
/** Validation tối thiểu cho contract nội bộ. Adapter FastAPI phải validate DTO trước khi map. */
export function validateResponse(response: VerificationResponse, sessionId?: string): void {
  if (!response || typeof response.sessionId !== 'string' || !response.sessionId
    || sessionId !== undefined && response.sessionId !== sessionId
    || !['mock', 'backend'].includes(response.source)
    || !['ACTIVE', 'COMPLETED', 'CANCELLED'].includes(response.sessionStatus)
    || !['ticket', 'identity', 'face', 'result'].includes(response.currentStep)
    || ![null, 'PASS', 'FAIL'].includes(response.finalDecision)
    || ![response.ticketStatus, response.identityStatus, response.faceStatus, response.livenessStatus].every((value) => statuses.includes(value))
    || response.errorCode !== null && !isVerificationErrorCode(response.errorCode)
    || ![null, 'ticket', 'identity', 'face', 'result'].includes(response.allowedNext)
    || !Array.isArray(response.latency) || !response.latency.every((metric) => metric && typeof metric.name === 'string'
      && metric.name.length > 0 && (metric.valueMs == null || typeof metric.valueMs === 'number'))
    || new Set(response.latency.map((metric) => metric.name)).size !== response.latency.length
    || !response.retry || typeof response.retry.allowed !== 'boolean'
    || ![null, 'ticket', 'identity', 'face'].includes(response.retry.target)
    || response.retry.allowed && response.retry.target === null
    || typeof response.createdAt !== 'string') throw new VerificationError('INVALID_RESPONSE');
}
