import { CameraOff } from 'lucide-react';
import type { ReactNode } from 'react';
import StatusIndicator from './StatusIndicator';
import type { StatusIndicatorProps } from './StatusIndicator';

export interface CameraPresentation { preview: ReactNode; controls: ReactNode }

export interface CameraFrameProps {
  label: string;
  /** Slot hiển thị video do bên ngoài sở hữu; component không mở hoặc quản lý stream. */
  children?: ReactNode;
  overlay?: ReactNode;
  placeholder?: ReactNode;
  status?: StatusIndicatorProps;
  className?: string;
}

export default function CameraFrame({ label, children, overlay, placeholder, status, className = '' }: CameraFrameProps) {
  return (
    <div className={`camera-frame ${className}`} role="group" aria-label={label}>
      <div className="camera-viewport">
        <div className="camera-media">
          {children ?? placeholder ?? (
            <div className="camera-empty">
              <CameraOff size={36} strokeWidth={1.5} aria-hidden="true" />
              <p>Camera chưa bật</p>
            </div>
          )}
        </div>
        {overlay && <div className="camera-overlay">{overlay}</div>}
      </div>
      {status && <div className="camera-status"><StatusIndicator {...status} /></div>}
    </div>
  );
}
