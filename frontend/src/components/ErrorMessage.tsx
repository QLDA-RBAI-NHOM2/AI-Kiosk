import { CircleAlert, RotateCcw } from 'lucide-react';
import KioskButton from './KioskButton';

export interface ErrorMessageProps {
  title: string;
  /** Nội dung an toàn đã được lớp gọi chọn, không truyền raw Error/stack/payload. */
  message: string;
  code?: string;
  /** Chỉ bật khi lớp gọi đã kiểm tra quyền kỹ thuật; đây không phải cơ chế phân quyền. */
  technical?: boolean;
  onRetry?: () => void;
  retryLabel?: string;
  retryLoading?: boolean;
}

export default function ErrorMessage({
  title, message, code, technical = false, onRetry, retryLabel = 'Thử lại', retryLoading = false,
}: ErrorMessageProps) {
  return (
    <div className="error-message" role="alert">
      <CircleAlert size={25} aria-hidden="true" />
      <div className="error-content">
        <h3>{title}</h3>
        <p>{message}</p>
        {technical && code && <p className="technical-code">Mã lỗi: <code>{code}</code></p>}
        {onRetry && (
          <KioskButton variant="outline" size="compact" onClick={onRetry} loading={retryLoading}>
            <RotateCcw size={18} aria-hidden="true" />{retryLabel}
          </KioskButton>
        )}
      </div>
    </div>
  );
}
