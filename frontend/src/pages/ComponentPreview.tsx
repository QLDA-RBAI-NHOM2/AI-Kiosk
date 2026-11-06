import { useState } from 'react';
import { ArrowRight, QrCode } from 'lucide-react';
import CameraFrame from '../components/CameraFrame';
import ErrorMessage from '../components/ErrorMessage';
import KioskButton from '../components/KioskButton';
import KioskCard from '../components/KioskCard';
import KioskLayout from '../components/KioskLayout';
import LatencyPanel from '../components/LatencyPanel';
import type { LatencyMetric } from '../components/LatencyPanel';
import LoadingState from '../components/LoadingState';
import OvalGuide from '../components/OvalGuide';
import QrScanFrame from '../components/QrScanFrame';
import ResultCard from '../components/ResultCard';
import StatusIndicator from '../components/StatusIndicator';
import type { IndicatorStatus } from '../components/StatusIndicator';
import type { KioskStepId } from '../components/StepProgress';

const stepIds: readonly KioskStepId[] = ['ticket', 'identity', 'face', 'result'];
const statuses: readonly IndicatorStatus[] = ['idle', 'processing', 'success', 'failed', 'warning', 'error'];
const demoMetrics: readonly LatencyMetric[] = [
  { id: 'ticket', label: 'qr_ticket_ms', valueMs: 0 },
  { id: 'database', label: 'db_lookup_ms', valueMs: null },
  { id: 'total', label: 'total_ms', valueMs: 124.5 },
];

// Chỉ được import trong development. Các mẫu và callback bên dưới là DEMO UI,
// không tạo phiên, quyết định xác thực, request API hoặc số đo thật.
export default function ComponentPreview() {
  const [currentStep, setCurrentStep] = useState<KioskStepId>('identity');
  const [clicks, setClicks] = useState(0);
  const [submits, setSubmits] = useState(0);
  const [retries, setRetries] = useState(0);
  const [navigationClicks, setNavigationClicks] = useState(0);
  const [startOvers, setStartOvers] = useState(0);
  const [extraMetric, setExtraMetric] = useState(false);
  const [buttonBusy, setButtonBusy] = useState(false);
  const metrics: readonly LatencyMetric[] = extraMetric
    ? [...demoMetrics, { id: 'demo-extra', label: 'Chỉ số bổ sung (DEMO)', valueMs: Number.NaN }]
    : demoMetrics;

  return (
    <KioskLayout
      header={{
        status: { status: 'warning', label: 'DEMO · Component Preview', announce: false },
        onStartOver: () => setStartOvers((count) => count + 1),
      }}
      progress={{ currentStep, completedSteps: ['ticket'], errorSteps: ['face'], className: 'preview-stepper' }}
      footerNote="DEMO UI — các callback chỉ cập nhật bộ đếm, không thực hiện xác thực."
      backAction={{ onClick: () => setNavigationClicks((count) => count + 1) }}
      continueAction={{ onClick: () => setNavigationClicks((count) => count + 1) }}
    >
      <div className="component-preview">
        <div className="preview-intro">
          <div>
            <p className="screen-eyebrow">DESIGN SYSTEM · DEMO</p>
            <h1>Bộ giao diện Kiosk</h1>
            <p>Thư viện giao diện sáng, rõ ràng và phù hợp thao tác cảm ứng.</p>
          </div>
          <a className="preview-home" href="/">Về giao diện Kiosk <ArrowRight size={18} aria-hidden="true" /></a>
        </div>

        <KioskCard heading="StepProgress & Layout" description="Chọn bước để kiểm tra props; biểu tượng tick và lỗi là trạng thái minh họa độc lập.">
          <div className="preview-control-row">
            {stepIds.map((id, index) => (
              <KioskButton key={id} size="compact" variant={currentStep === id ? 'primary' : 'outline'} aria-pressed={currentStep === id} onClick={() => setCurrentStep(id)}>
                Bước {index + 1}
              </KioskButton>
            ))}
          </div>
          <p className="preview-counter">Start Over: <output aria-label="Số lượt Start Over">{startOvers}</output> · Footer: <output aria-label="Số lượt điều hướng">{navigationClicks}</output></p>
        </KioskCard>

        <div className="preview-grid">
          <KioskCard heading="KioskButton" description="Primary, Secondary, Outline, Disabled và Loading. Focus bằng Tab; kích hoạt bằng Enter hoặc Space.">
            <form aria-label="Thử hành vi nút" onSubmit={(event) => { event.preventDefault(); setSubmits((count) => count + 1); }}>
              <div className="button-gallery">
                <KioskButton onClick={() => setClicks((count) => count + 1)}>Primary</KioskButton>
                <KioskButton variant="secondary">Secondary</KioskButton>
                <KioskButton variant="outline">Outline</KioskButton>
                <KioskButton disabled onClick={() => setClicks((count) => count + 1)}>Disabled</KioskButton>
                <KioskButton loading onClick={() => setClicks((count) => count + 1)}>Loading</KioskButton>
              </div>
            </form>
            <p className="preview-counter">Nhấn: <output aria-label="Số lượt nhấn">{clicks}</output> · Submit: <output aria-label="Số lần submit">{submits}</output></p>
            <div className="preview-control-row">
              <KioskButton loading={buttonBusy} loadingLabel="Đang chờ DEMO">Tác vụ DEMO</KioskButton>
              <KioskButton size="compact" variant="outline" onClick={() => setButtonBusy(!buttonBusy)}>Chuyển trạng thái Loading</KioskButton>
            </div>
          </KioskCard>

          <KioskCard heading="StatusIndicator" description="Mỗi trạng thái có icon và văn bản; không dựa riêng vào màu sắc.">
            <div className="status-gallery">
              {statuses.map((status) => <StatusIndicator key={status} status={status} announce={false} />)}
            </div>
            <div className="preview-muted-note">Mọi trạng thái ở đây là mẫu UI, không phải kết quả của module.</div>
          </KioskCard>

          <KioskCard heading="LoadingState" description="Không có timer hoặc tự chuyển sang thành công.">
            <LoadingState title="Đang chờ phản hồi (DEMO)" description="Trạng thái chỉ thay đổi khi bên gọi truyền props mới." />
          </KioskCard>

          <KioskCard heading="ErrorMessage" description="Thông điệp hành khách an toàn. Mã kỹ thuật bị ẩn mặc định.">
            <div role="group" aria-label="Lỗi hành khách">
              <ErrorMessage
                title="Chưa thể tiếp tục (DEMO)"
                message="Vui lòng kiểm tra mã và thử lại khi được hướng dẫn."
                code="DEMO_PRIVATE_CODE"
                onRetry={() => setRetries((count) => count + 1)}
              />
            </div>
            <p className="preview-counter">Retry: <output aria-label="Số lượt Retry">{retries}</output></p>
          </KioskCard>

          <KioskCard heading="CameraFrame + OvalGuide" description="Chỉ có khung hướng dẫn. Camera chưa bật, không phát hiện khuôn mặt.">
            <CameraFrame label="Khung khuôn mặt minh họa" overlay={<OvalGuide />} status={{ status: 'idle', label: 'Đưa khuôn mặt vào khung hướng dẫn', announce: false }} />
          </KioskCard>

          <KioskCard heading="CameraFrame + QrScanFrame" description="Overlay QR tái sử dụng được; không đọc hoặc giải mã QR.">
            <CameraFrame
              label="Khung QR minh họa"
              placeholder={<span className="camera-placeholder-label">Camera chưa bật</span>}
              overlay={<QrScanFrame><QrCode size={80} strokeWidth={1.5} className="qr-demo-icon" /></QrScanFrame>}
              status={{ status: 'idle', label: 'Đưa mã QR vào khung hướng dẫn', announce: false }}
            />
          </KioskCard>
        </div>

        <section className="preview-section" aria-labelledby="result-examples-title">
          <div className="preview-section-heading"><h2 id="result-examples-title">ResultCard & FailReasonBanner</h2><span className="demo-badge">DEMO</span></div>
          <p className="card-description">Kết quả cố định được truyền bằng props; không suy luận PASS/FAIL tại Frontend.</p>
          <div className="result-gallery">
            <ResultCard status="PASS" title="Xác thực thành công (DEMO)" message="Mẫu hiển thị khi bên gọi cung cấp kết quả PASS." />
            <ResultCard status="FAIL" title="Chưa thể xác thực (DEMO)" message="Mẫu kết quả FAIL được cung cấp từ bên ngoài." reason={{ code: 'DEMO_REASON', message: 'Thông tin minh họa chưa khớp. Vui lòng nhờ hỗ trợ.' }} technical />
            <ResultCard status="PROCESSING" title="Đang kiểm tra (DEMO)" message="Chờ quyết định từ bên gọi; chưa có kết quả cuối cùng." />
          </div>
        </section>

        <section className="preview-section" aria-labelledby="latency-examples-title">
          <div className="preview-section-heading"><h2 id="latency-examples-title">LatencyPanel</h2><span className="demo-badge">DEMO · không phải số đo thật</span></div>
          <p className="card-description">Bộ 7 trường còn cần Backend xác nhận đầy đủ. Ví dụ phân biệt 0, chưa có số đo và dữ liệu không hợp lệ.</p>
          <div className="preview-control-row">
            <KioskButton size="compact" variant="outline" onClick={() => setExtraMetric(!extraMetric)}>{extraMetric ? 'Bỏ chỉ số DEMO' : 'Thêm chỉ số DEMO'}</KioskButton>
          </div>
          <div className="preview-grid">
            <div role="region" aria-label="Latency có dữ liệu"><LatencyPanel metrics={metrics} demo defaultOpen note="Số liệu minh họa, đơn vị ms. Tên bổ sung DEMO không thuộc schema Backend." /></div>
            <div role="region" aria-label="Latency chưa có dữ liệu"><LatencyPanel metrics={[]} demo defaultOpen note="Mẫu không có số đo." /></div>
          </div>
        </section>

        <KioskCard heading="KioskCard" variant="muted" description="Variant nền nhạt dùng cho hướng dẫn hoặc thông báo phụ.">
          <p>Toàn bộ màu sắc và khoảng cách dùng chung token với giao diện Kiosk hiện tại.</p>
        </KioskCard>
      </div>
    </KioskLayout>
  );
}
