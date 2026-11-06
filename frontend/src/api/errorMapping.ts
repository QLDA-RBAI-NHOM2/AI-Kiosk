import type { VerificationErrorCode } from './types.ts';

const messages: Record<VerificationErrorCode, string> = {
  SERVICE_UNAVAILABLE: 'Hệ thống xác thực chưa được kết nối. Vui lòng liên hệ nhân viên hỗ trợ.',
  INVALID_TICKET: 'Mã vé mô phỏng không hợp lệ. Vui lòng thử lại hoặc xem kết quả MOCK.',
  IDENTITY_MISMATCH: 'Định danh mô phỏng không khớp với vé. Vui lòng thử lại hoặc nhờ hỗ trợ.',
  FACE_MISMATCH: 'Kịch bản MOCK trả về khuôn mặt không khớp. Vui lòng thử lại hoặc nhờ hỗ trợ.',
  LIVENESS_FAILED: 'Kịch bản MOCK trả về Liveness không đạt. Vui lòng thử lại hoặc nhờ hỗ trợ.',
  REQUEST_TIMEOUT: 'Hệ thống mô phỏng phản hồi quá lâu. Có thể thử lại; đây không phải quyết định FAIL.',
  NETWORK_ERROR: 'Chưa thể kết nối dịch vụ mô phỏng. Vui lòng thử lại hoặc bắt đầu phiên mới.',
  SESSION_CANCELLED: 'Phiên đã bị hủy bởi dịch vụ mô phỏng. Vui lòng bắt đầu lại.',
  REQUEST_CANCELLED: 'Yêu cầu đã được hủy. Không sử dụng kết quả đang chờ.',
  INVALID_SESSION: 'Phiên không còn hợp lệ. Vui lòng bắt đầu lại.',
  DUPLICATE_REQUEST: 'Một yêu cầu đang được xử lý. Vui lòng chờ.',
  STALE_RESPONSE: 'Phản hồi cũ đã bị bỏ qua. Vui lòng sử dụng phiên hiện tại.',
  STEP_NOT_ALLOWED: 'Chưa thể mở bước này. Vui lòng hoàn thành bước xác thực trước.',
  RESULT_NOT_READY: 'Dịch vụ chưa có quyết định cuối cùng. Vui lòng hoàn thành bước hiện tại.',
  INVALID_RESPONSE: 'Dữ liệu phản hồi chưa hợp lệ. Vui lòng bắt đầu lại hoặc nhờ hỗ trợ.',
  UNKNOWN_ERROR: 'Hệ thống chưa thể hoàn tất yêu cầu. Vui lòng bắt đầu lại hoặc nhờ hỗ trợ.',
};
const businessCodes: readonly VerificationErrorCode[] = ['INVALID_TICKET', 'IDENTITY_MISMATCH', 'FACE_MISMATCH', 'LIVENESS_FAILED'];
export const isVerificationErrorCode = (value: unknown): value is VerificationErrorCode => typeof value === 'string' && Object.hasOwn(messages, value);

export class VerificationError extends Error {
  readonly code: VerificationErrorCode;
  constructor(code: VerificationErrorCode) {
    super(messages[code]);
    this.name = 'VerificationError';
    this.code = code;
  }
}

export interface VerificationIssue {
  code: VerificationErrorCode;
  category: 'business' | 'technical' | 'cancelled';
  message: string;
  recoverable: boolean;
}

export function mapVerificationError(error: unknown): VerificationIssue {
  const code = error instanceof VerificationError ? error.code : 'UNKNOWN_ERROR';
  return {
    code,
    category: businessCodes.includes(code) ? 'business'
      : code === 'SESSION_CANCELLED' || code === 'REQUEST_CANCELLED' ? 'cancelled' : 'technical',
    message: messages[code],
    recoverable: businessCodes.includes(code) || code === 'NETWORK_ERROR' || code === 'REQUEST_TIMEOUT',
  };
}

export const issueForCode = (code: VerificationErrorCode) => mapVerificationError(new VerificationError(code));
const terminalReasons: Partial<Record<VerificationErrorCode, string>> = {
  INVALID_TICKET: 'Mã vé trong kịch bản MOCK không hợp lệ.',
  IDENTITY_MISMATCH: 'Định danh trong kịch bản MOCK không khớp với vé.',
  FACE_MISMATCH: 'Khuôn mặt trong kịch bản MOCK không khớp.',
  LIVENESS_FAILED: 'Liveness trong kịch bản MOCK không đạt.',
};
export const finalReasonForCode = (code: VerificationErrorCode | null) =>
  (code ? terminalReasons[code] : null) ?? 'Dịch vụ chưa thể xác thực phiên này. Vui lòng bắt đầu lại hoặc nhờ hỗ trợ.';
