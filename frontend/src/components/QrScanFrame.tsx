import type { ReactNode } from 'react';

export interface QrScanFrameProps { children?: ReactNode; className?: string }

export default function QrScanFrame({ children, className = '' }: QrScanFrameProps) {
  return (
    <div className={`qr-overlay ${className}`} aria-hidden="true">
      <div className="qr-guide">
        <span className="scan-corner corner-top-left" />
        <span className="scan-corner corner-top-right" />
        <span className="scan-corner corner-bottom-left" />
        <span className="scan-corner corner-bottom-right" />
        {children}
      </div>
    </div>
  );
}
