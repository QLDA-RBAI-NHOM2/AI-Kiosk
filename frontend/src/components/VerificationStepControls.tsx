import { ScanLine, X } from 'lucide-react';
import type { VerificationIssue } from '../api/errorMapping';
import type { StepStatus } from '../api/types';
import ErrorMessage from './ErrorMessage';
import KioskButton from './KioskButton';
import type { StatusIndicatorProps } from './StatusIndicator';

const statusView: Record<StepStatus, { status: StatusIndicatorProps['status']; label: string }> = {
  IDLE: { status: 'idle', label: 'Sẵn sàng mô phỏng' }, SCANNING: { status: 'processing', label: 'Đang quét mô phỏng' },
  PROCESSING: { status: 'processing', label: 'Đang xử lý mô phỏng' }, PASSED: { status: 'success', label: 'PASSED · MOCK' },
  FAILED: { status: 'failed', label: 'FAILED · MOCK' }, ERROR: { status: 'error', label: 'Lỗi kỹ thuật' },
  TIMEOUT: { status: 'warning', label: 'Quá thời gian phản hồi' }, CANCELLED: { status: 'warning', label: 'Đã hủy' },
};
export const statusIndicatorFor = (status: StepStatus, prefix = ''): StatusIndicatorProps => ({
  ...statusView[status], label: `${prefix}${prefix ? ': ' : ''}${statusView[status].label}`,
});

export interface VerificationStepControlsProps {
  status: StepStatus;
  label: string;
  issue: VerificationIssue | null;
  busy: boolean;
  canVerify: boolean;
  canRetry: boolean;
  canShowResult: boolean;
  onVerify: () => void;
  onRetry: () => void;
  onShowResult: () => void;
  onCancel: () => void;
}

/** Chỉ trình bày trạng thái và hành động do controller cấp. */
export default function VerificationStepControls(props: VerificationStepControlsProps) {
  return (
    <div className="verification-controls">
      {props.issue && <ErrorMessage title={props.issue.category === 'business' ? 'Chưa đạt bước xác thực MOCK' : 'Chưa thể tiếp tục'}
        message={props.issue.message} onRetry={props.canRetry ? props.onRetry : undefined} />}
      <div className="verification-actions">
        {!props.issue && <KioskButton onClick={props.onVerify} disabled={!props.canVerify} loading={props.busy} loadingLabel="Đang xử lý MOCK…">
          <ScanLine size={22} aria-hidden="true" />{props.label}
        </KioskButton>}
        {props.canShowResult && <KioskButton variant="outline" onClick={props.onShowResult} disabled={props.busy}>Xem kết quả MOCK</KioskButton>}
        <KioskButton variant="secondary" onClick={props.onCancel}><X size={20} aria-hidden="true" />Cancel</KioskButton>
      </div>
    </div>
  );
}
