import { CreditCard, Move, QrCode, Sun } from 'lucide-react';
import CameraFrame from '../components/CameraFrame';
import type { CameraPresentation } from '../components/CameraFrame';
import ErrorMessage from '../components/ErrorMessage';
import QrScanFrame from '../components/QrScanFrame';
import type { StatusIndicatorProps } from '../components/StatusIndicator';
import VerificationStepControls, { statusIndicatorFor } from '../components/VerificationStepControls';
import type { VerificationStepControlsProps } from '../components/VerificationStepControls';

export type TicketPreviewState = 'ready' | 'scanning' | 'processing' | 'error';

export interface TicketScanPageProps {
  previewState?: TicketPreviewState;
  onRetry?: () => void;
  verification?: VerificationStepControlsProps;
  camera?: CameraPresentation;
}

const previewStatus: Record<TicketPreviewState, StatusIndicatorProps> = {
  ready: { status: 'idle', label: 'Ready · Preview — camera chưa bật' },
  scanning: { status: 'processing', label: 'Scanning · DEMO — chưa quét QR thật' },
  processing: { status: 'processing', label: 'Processing · DEMO — chưa kiểm tra vé' },
  error: { status: 'error', label: 'Error · DEMO — trạng thái lỗi minh họa' },
};

export default function TicketScanPage({ previewState = 'ready', onRetry, verification, camera }: TicketScanPageProps) {
  return (
    <section className="kiosk-page ticket-page" aria-labelledby="ticket-title">
      <p className="screen-eyebrow">BƯỚC 01 · QUÉT VÉ</p>
      <h1 id="ticket-title" tabIndex={-1}>Scan Boarding Pass</h1>
      <p className="page-intro">Đưa mã QR trên vé vào vùng quét theo hướng dẫn.</p>
      <CameraFrame
        label="Khung QR vé và preview camera" className="ticket-camera"
        placeholder={<span className="camera-placeholder-label">Camera chưa bật · MOCK / DEMO</span>}
        status={{ ...(verification ? statusIndicatorFor(verification.status, 'Ticket') : previewStatus[previewState]), announce: !!verification }}
        overlay={(
          <QrScanFrame>
            {!camera && <div className="ticket-illustration">
              <QrCode size={88} strokeWidth={1.5} />
              <span className="ticket-divider" /><span className="ticket-line ticket-line-long" /><span className="ticket-line" />
            </div>}
          </QrScanFrame>
        )}
      >{camera?.preview}</CameraFrame>
      {!verification && previewState === 'error' && (
        <div className="page-error">
          <ErrorMessage title="Chưa thể quét vé (DEMO)" message="Đây là trạng thái lỗi minh họa. Chưa đọc hoặc xác thực mã QR." onRetry={onRetry} />
        </div>
      )}
      <ul className="scan-tips" aria-label="Hướng dẫn quét vé">
        <li><CreditCard size={20} aria-hidden="true" /><span>Chuẩn bị mã QR vé</span></li>
        <li><Move size={20} aria-hidden="true" /><span>Giữ mã trong khung</span></li>
        <li><Sun size={20} aria-hidden="true" /><span>Tránh ánh sáng phản chiếu</span></li>
      </ul>
      {camera?.controls}
      {verification && <VerificationStepControls {...verification} />}
    </section>
  );
}
