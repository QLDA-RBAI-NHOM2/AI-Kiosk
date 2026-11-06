import { CameraOff, Eye, MoveHorizontal, ScanFace } from 'lucide-react';
import CameraFrame from '../components/CameraFrame';
import type { CameraPresentation } from '../components/CameraFrame';
import KioskCard from '../components/KioskCard';
import OvalGuide from '../components/OvalGuide';
import StatusIndicator from '../components/StatusIndicator';
import VerificationStepControls, { statusIndicatorFor } from '../components/VerificationStepControls';
import type { VerificationStepControlsProps } from '../components/VerificationStepControls';
import type { StepStatus } from '../api/types';

export default function FaceVerifyPage({ verification, livenessStatus = 'IDLE', camera }: { verification?: VerificationStepControlsProps; livenessStatus?: StepStatus; camera?: CameraPresentation }) {
  return (
    <section className="kiosk-page face-page" aria-labelledby="face-title">
      <p className="screen-eyebrow">BƯỚC 03 · KHUÔN MẶT & LIVENESS</p>
      <h1 id="face-title" tabIndex={-1}>Face &amp; Liveness Verification</h1>
      <p className="page-intro">Căn khuôn mặt vào khung oval và làm theo hướng dẫn khi được yêu cầu.</p>
      <div className="verification-grid">
        <CameraFrame
          label="Khung hướng dẫn khuôn mặt và preview camera" className="face-camera"
          placeholder={<><span className="camera-placeholder-label">Camera chưa bật · MOCK / DEMO</span><CameraOff size={36} className="face-placeholder-icon" aria-hidden="true" /></>}
          overlay={<OvalGuide />}
          status={{ ...statusIndicatorFor(verification?.status ?? 'IDLE', 'Face'), announce: !!verification }}
        >{camera?.preview}</CameraFrame>
        <KioskCard heading="Hướng dẫn thao tác" className="face-instructions">
          <ol>
            <li><ScanFace size={24} aria-hidden="true" /><div><h3>Nhìn thẳng</h3><p>Giữ khuôn mặt ở giữa khung.</p></div></li>
            <li><Eye size={24} aria-hidden="true" /><div><h3>Chớp mắt</h3><p>Thực hiện khi được hướng dẫn.</p></div></li>
            <li><MoveHorizontal size={24} aria-hidden="true" /><div><h3>Quay nhẹ đầu</h3><p>Làm theo từng yêu cầu hiển thị.</p></div></li>
          </ol>
          <StatusIndicator {...statusIndicatorFor(livenessStatus, 'Liveness')} />
        </KioskCard>
      </div>
      <p className="preview-disclaimer">MOCK / DEMO · Preview camera không chạy Face Recognition hoặc Liveness AI.</p>
      {camera?.controls}
      {verification && <VerificationStepControls {...verification} />}
    </section>
  );
}
