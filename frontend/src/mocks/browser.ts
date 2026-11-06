import { MockVerificationApi } from './handlers';
import type { MockScenario } from '../api/types';

/** Composition factory MOCK; không intercept fetch hoặc đăng ký service worker. */
export const createMockVerificationApi = (scenario: MockScenario = 'ALL_PASS') => new MockVerificationApi({ scenario });
