import { useId } from 'react';
import { Camera, CameraOff, ScanLine } from 'lucide-react';
import type { CameraState, CameraStatus, CameraIssue } from '../camera/types';
import type { FrameMetadata } from '../hooks/useFrameCapture';
import KioskButton from './KioskButton';
import StatusIndicator from './StatusIndicator';
import type { StatusIndicatorProps } from './StatusIndicator';
import ErrorMessage from './ErrorMessage';

const labels: Record<CameraStatus, { status: StatusIndicatorProps['status']; label: string }> = {
  IDLE: { status: 'idle', label: 'Camera đang tắt' }, REQUESTING_PERMISSION: { status: 'processing', label: 'Đang yêu cầu quyền camera' },
  READY: { status: 'idle', label: 'Camera ready · Chưa xác thực' }, PERMISSION_DENIED: { status: 'warning', label: 'Quyền camera bị từ chối' },
  UNAVAILABLE: { status: 'warning', label: 'Camera unavailable' }, UNSUPPORTED: { status: 'warning', label: 'Trình duyệt chưa hỗ trợ camera' },
  DISCONNECTED: { status: 'warning', label: 'Camera disconnected' }, ERROR: { status: 'error', label: 'Camera chưa hoạt động' },
};
export interface CameraControlsProps {
  camera: CameraState; canCapture: boolean; capturing: boolean; metadata: FrameMetadata | null; captureIssue: CameraIssue | null;
  onStart: (deviceId?: string) => void; onStop: () => void; onCapture: () => void;
}

export default function CameraControls({ camera, canCapture, capturing, metadata, captureIssue, onStart, onStop, onCapture }: CameraControlsProps) {
  const selectId = useId();
  const running = camera.status === 'READY' || camera.status === 'REQUESTING_PERMISSION';
  return <section className="camera-controls" aria-label="Điều khiển camera">
    <div className="camera-toolbar">
      <StatusIndicator {...labels[camera.status]} />
      {running ? <KioskButton variant="outline" size="compact" onClick={onStop}><CameraOff size={19} aria-hidden="true" />Dừng camera</KioskButton>
        : <KioskButton variant="outline" size="compact" onClick={() => onStart()}><Camera size={19} aria-hidden="true" />Bật camera</KioskButton>}
      {camera.devices.length > 1 && <div className="camera-select"><label htmlFor={selectId} className="sr-only">Chọn camera</label>
        <select id={selectId} value={camera.selectedDeviceId ?? ''} disabled={camera.status !== 'READY'} onChange={(event) => onStart(event.target.value)}>
          {!camera.selectedDeviceId && <option value="">Camera mặc định</option>}
          {camera.devices.map((device) => <option key={device.deviceId} value={device.deviceId}>{device.label}</option>)}
        </select></div>}
      <KioskButton variant="outline" size="compact" disabled={!canCapture} loading={capturing} onClick={onCapture}><ScanLine size={19} aria-hidden="true" />Capture frame</KioskButton>
    </div>
    <p className="camera-demo-policy">MOCK / DEMO · Có thể xác thực mô phỏng khi camera tắt hoặc bị từ chối. Preview/capture không giải mã QR, chạy AI hoặc quyết định PASS.</p>
    {camera.issue && <ErrorMessage title="Thông báo camera" message={camera.issue.message} />}
    {captureIssue && <ErrorMessage title="Thông báo capture" message={captureIssue.message} />}
    {metadata && <p className="capture-metadata" role="status">Đã capture {metadata.width} × {metadata.height} · {metadata.type} · {metadata.size} bytes. Frame đã được bỏ, không lưu hoặc gửi.</p>}
  </section>;
}
