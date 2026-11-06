import type { CameraErrorCode, CameraIssue, CameraStatus } from './types.ts';

const messages: Record<CameraErrorCode, string> = {
  INSECURE_CONTEXT: 'Trình duyệt chỉ cho mở camera qua HTTPS hoặc localhost. Vui lòng mở kiosk trong môi trường phù hợp.',
  UNSUPPORTED: 'Trình duyệt này chưa hỗ trợ MediaDevices. Bạn vẫn có thể chạy luồng MOCK không dùng camera.',
  PERMISSION_DENIED: 'Quyền camera đã bị từ chối. Cho phép camera trong cài đặt trình duyệt rồi bấm Bật camera để thử lại.',
  NO_DEVICE: 'Không tìm thấy camera. Kiểm tra kết nối thiết bị hoặc tiếp tục mô phỏng không dùng camera.',
  DEVICE_BUSY: 'Chưa thể mở camera. Thiết bị có thể đang được ứng dụng khác sử dụng.',
  CONSTRAINTS_UNAVAILABLE: 'Camera chưa hỗ trợ cấu hình được yêu cầu. Vui lòng chọn camera khác hoặc kết nối lại thiết bị.',
  DISCONNECTED: 'Camera đã mất kết nối. Kiểm tra thiết bị rồi bấm Bật camera để kết nối lại.',
  CAMERA_ERROR: 'Chưa thể mở camera. Vui lòng kiểm tra thiết bị và quyền trình duyệt.',
  CAMERA_NOT_ACTIVE: 'Camera không hoạt động trong bước hiện tại. Vui lòng bật camera trước khi capture.',
  CAPTURE_NOT_READY: 'Video chưa có khung hình. Vui lòng chờ hình ảnh xuất hiện rồi thử lại.',
  CAPTURE_CANCELLED: 'Đã bỏ frame vì camera, bước hoặc phiên đã thay đổi.',
  CAPTURE_FAILED: 'Chưa thể tạo frame. Vui lòng bật lại camera và thử lại.',
};
export class CameraError extends Error {
  readonly code: CameraErrorCode;
  constructor(code: CameraErrorCode) { super(messages[code]); this.name = 'CameraError'; this.code = code; }
}
export const cameraIssue = (code: CameraErrorCode): CameraIssue => ({ code, message: messages[code] });
export function mapCameraError(error: unknown): { status: CameraStatus; issue: CameraIssue } {
  const name = error instanceof Error ? error.name : '';
  const code: CameraErrorCode = error instanceof CameraError ? error.code
    : name === 'NotAllowedError' || name === 'SecurityError' ? 'PERMISSION_DENIED'
    : name === 'NotFoundError' || name === 'DevicesNotFoundError' ? 'NO_DEVICE'
    : name === 'NotReadableError' || name === 'TrackStartError' ? 'DEVICE_BUSY'
    : name === 'OverconstrainedError' ? 'CONSTRAINTS_UNAVAILABLE' : 'CAMERA_ERROR';
  return { issue: cameraIssue(code), status: code === 'PERMISSION_DENIED' ? 'PERMISSION_DENIED'
    : code === 'UNSUPPORTED' ? 'UNSUPPORTED' : code === 'DISCONNECTED' ? 'DISCONNECTED'
    : ['NO_DEVICE', 'DEVICE_BUSY', 'CONSTRAINTS_UNAVAILABLE', 'INSECURE_CONTEXT'].includes(code) ? 'UNAVAILABLE' : 'ERROR' };
}
