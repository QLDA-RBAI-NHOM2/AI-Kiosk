import { Circle, CircleAlert, CircleCheck, CircleX, LoaderCircle, TriangleAlert } from 'lucide-react';

export type IndicatorStatus = 'idle' | 'processing' | 'success' | 'failed' | 'warning' | 'error';

export interface StatusIndicatorProps {
  status: IndicatorStatus;
  label?: string;
  announce?: boolean;
  className?: string;
}

const presentation = {
  idle: { icon: Circle, label: 'Sẵn sàng chờ thao tác' },
  processing: { icon: LoaderCircle, label: 'Đang xử lý' },
  success: { icon: CircleCheck, label: 'Hoàn tất bước' },
  failed: { icon: CircleX, label: 'Không đạt' },
  warning: { icon: TriangleAlert, label: 'Cần chú ý' },
  error: { icon: CircleAlert, label: 'Có lỗi' },
} as const;

export default function StatusIndicator({ status, label, announce = true, className = '' }: StatusIndicatorProps) {
  const { icon: Icon, label: defaultLabel } = presentation[status];
  return (
    <span className={`status-indicator status-${status} ${className}`} role={announce ? 'status' : undefined}>
      <Icon size={20} className={status === 'processing' ? 'ui-spinner' : undefined} aria-hidden="true" />
      <span>{label ?? defaultLabel}</span>
    </span>
  );
}
