import { IdCard } from 'lucide-react';
import CameraFrame from '../components/CameraFrame';
import type { CameraPresentation } from '../components/CameraFrame';
import KioskCard from '../components/KioskCard';
import QrScanFrame from '../components/QrScanFrame';
import VerificationStepControls, { statusIndicatorFor } from '../components/VerificationStepControls';
import type { VerificationStepControlsProps } from '../components/VerificationStepControls';

export default function IdentityScanPage({ verification, camera }: { verification?: VerificationStepControlsProps; camera?: CameraPresentation }) {
  return (
    <section className="kiosk-page identity-page" aria-labelledby="identity-title">
      <p className="screen-eyebrow">BƯỚC 02 · ĐỊNH DANH</p>
      <h1 id="identity-title" tabIndex={-1}>Verify Identity</h1>
      <p className="page-intro">Đặt mã QR định danh vào khung hướng dẫn.</p>
      <div className="verification-grid">
        <CameraFrame
          label="Khung QR định danh và preview camera" className="identity-camera"
          placeholder={<span className="camera-placeholder-label">Camera chưa bật · MOCK / DEMO</span>}
          overlay={<QrScanFrame>{!camera && <IdCard size={86} strokeWidth={1.4} className="qr-demo-icon" />}</QrScanFrame>}
          status={{ ...(verification ? statusIndicatorFor(verification.status, 'Identity') : { status: 'idle', label: 'Chưa đọc hoặc đối chiếu định danh' }), announce: !!verification }}
        >{camera?.preview}</CameraFrame>
        <KioskCard heading="Thông tin hành khách" description="Chưa có thông tin hành khách." className="passenger-placeholder">
          <dl className="passenger-fields">
            <div><dt>Họ và tên</dt><dd>—</dd></div>
            <div><dt>Thông tin định danh</dt><dd>—</dd></div>
            <div><dt>Đối chiếu với vé</dt><dd>{verification?.status === 'PASSED' ? 'PASSED · MOCK' : 'Chưa có kết quả hợp lệ'}</dd></div>
          </dl>
          <p className="placeholder-note">Vùng thông tin để trống; không có dữ liệu cá nhân trong mô phỏng.</p>
        </KioskCard>
      </div>
      <p className="preview-disclaimer">MOCK / DEMO · Chỉ tiếp tục khi adapter mô phỏng chấp nhận bước định danh.</p>
      {camera?.controls}
      {verification && <VerificationStepControls {...verification} />}
    </section>
  );
}
