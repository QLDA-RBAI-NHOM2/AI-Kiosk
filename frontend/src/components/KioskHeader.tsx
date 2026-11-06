import { Plane, RotateCcw } from 'lucide-react';
import KioskButton from './KioskButton';
import StatusIndicator from './StatusIndicator';
import type { StatusIndicatorProps } from './StatusIndicator';

export interface KioskHeaderProps {
  title?: string;
  subtitle?: string;
  status?: StatusIndicatorProps;
  onStartOver?: () => void;
  startOverDisabled?: boolean;
}

export default function KioskHeader({
  title = 'Airport AI Verification Kiosk', subtitle = 'Hệ thống mô phỏng xác thực hành khách',
  status = { status: 'idle', label: 'Bản xem trước giao diện', announce: false },
  onStartOver, startOverDisabled = false,
}: KioskHeaderProps) {
  return (
    <header className="kiosk-header">
      <div className="flex items-center gap-4">
        <span className="brand-mark" aria-hidden="true">
          <Plane size={32} strokeWidth={1.8} />
        </span>
        <div>
          <p className="brand-name">{title}</p>
          <p className="brand-caption">{subtitle}</p>
        </div>
      </div>
      <div className="header-actions">
        <StatusIndicator {...status} />
        {onStartOver && (
          <KioskButton variant="outline" size="compact" onClick={onStartOver} disabled={startOverDisabled}>
            <RotateCcw size={18} aria-hidden="true" />Start Over
          </KioskButton>
        )}
      </div>
    </header>
  );
}
