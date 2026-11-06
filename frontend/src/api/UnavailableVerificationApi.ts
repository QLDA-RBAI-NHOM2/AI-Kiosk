import { issueForCode, VerificationError } from './errorMapping.ts';
import type { VerificationApi } from './types.ts';

/** Production chưa có Backend: từ chối operation, không HTTP, session hoặc quyết định giả. */
export class UnavailableVerificationApi implements VerificationApi {
  readonly availability = Object.freeze({
    status: 'SERVICE_UNAVAILABLE' as const,
    message: issueForCode('SERVICE_UNAVAILABLE').message,
  });
  private refuse(): never { throw new VerificationError('SERVICE_UNAVAILABLE'); }
  createSession: VerificationApi['createSession'] = async () => this.refuse();
  verifyTicket: VerificationApi['verifyTicket'] = async () => this.refuse();
  verifyIdentity: VerificationApi['verifyIdentity'] = async () => this.refuse();
  verifyFaceAndLiveness: VerificationApi['verifyFaceAndLiveness'] = async () => this.refuse();
  getSessionResult: VerificationApi['getSessionResult'] = async () => this.refuse();
  cancelSession: VerificationApi['cancelSession'] = async () => this.refuse();
}
