import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import KioskLayout from './components/KioskLayout';
import WelcomePage from './pages/Welcome';
import TicketScanPage from './pages/ScanTicket';
import IdentityScanPage from './pages/ScanIdentity';
import FaceVerifyPage from './pages/FaceCapture';
import ResultPage from './pages/Result';
import type { VerificationApi, VerificationStep } from './api/types';
import { finalReasonForCode } from './api/errorMapping';
import { mapLatency } from './api/latencyMapping';
import { useSession } from './hooks/useSession';
import { canContinue, canRetry, stepFailed, stepPassed } from './state/verificationReducer';
import type { VerificationStepControlsProps } from './components/VerificationStepControls';
import ErrorMessage from './components/ErrorMessage';
import KioskButton from './components/KioskButton';
import LoadingState from './components/LoadingState';
import LatencyPanel from './components/LatencyPanel';
import { useCamera } from './hooks/useCamera';
import { useFrameCapture } from './hooks/useFrameCapture';
import CameraVideo from './components/CameraVideo';
import CameraControls from './components/CameraControls';
import type { CameraMode, CameraProvider } from './camera/types';
import type { CameraPresentation } from './components/CameraFrame';

export interface AppProps {
  api: VerificationApi;
  cameraProvider?: CameraProvider;
  developerControls?: ReactNode;
  technicalMode?: boolean;
  /** Chỉ truyền panel với dữ liệu/quyền đã được lớp tích hợp kiểm tra. */
  technicalPanel?: ReactNode;
}

export default function App({ api, cameraProvider, developerControls, technicalMode = false, technicalPanel }: AppProps) {
  const { state, controller } = useSession(api);
  const { session, request, issue } = state;
  const screen = session?.currentStep ?? 'welcome';
  const mode: CameraMode = screen === 'ticket' ? 'TICKET_QR' : screen === 'identity' ? 'IDENTITY_QR' : screen === 'face' ? 'FACE' : 'IDLE';
  const camera = useCamera({ sessionId: session?.sessionId ?? null, active: session?.sessionStatus === 'ACTIVE', mode }, cameraProvider);
  const capture = useFrameCapture(camera.provider, `${state.generation}:${session?.sessionId ?? ''}:${mode}`, camera.state.stream);
  const pageRoot = useRef<HTMLDivElement>(null);
  const previousScreen = useRef(screen);
  const startOver = () => { camera.stopCamera(); controller.startOver(); };
  const cancel = () => { camera.stopCamera(); controller.cancel(); };
  const busy = request !== null;

  useEffect(() => {
    if (previousScreen.current !== screen) {
      pageRoot.current?.querySelector('h1')?.focus();
      previousScreen.current = screen;
    }
  }, [screen]);

  const controlsFor = (step: VerificationStep): VerificationStepControlsProps => ({
    status: session?.[`${step}Status`] ?? 'IDLE',
    label: step === 'ticket' ? 'Mock Scan / Verify' : step === 'identity' ? 'Mock Verify Identity' : 'Mock Face & Liveness',
    issue, busy, canVerify: !busy && !issue && session?.sessionStatus === 'ACTIVE'
      && ['IDLE', 'SCANNING'].includes(session[`${step}Status`]),
    canRetry: canRetry(state), canShowResult: !!session && session.sessionStatus === 'ACTIVE' && stepFailed(session, step),
    onVerify: () => { void controller.verify(); }, onRetry: () => { void controller.retry(); },
    onShowResult: () => { void controller.showResult(); }, onCancel: cancel,
  });
  const cameraView: CameraPresentation = {
    preview: <CameraVideo camera={camera.state} videoRef={capture.videoRef} onReady={capture.setReady} />,
    controls: session?.sessionStatus === 'ACTIVE' ? <CameraControls camera={camera.state}
      canCapture={capture.ready && camera.state.status === 'READY' && !busy && !capture.capturing}
      capturing={capture.capturing} metadata={capture.metadata} captureIssue={capture.issue}
      onStart={(deviceId) => { void camera.startCamera(deviceId); }} onStop={camera.stopCamera} onCapture={() => { void capture.capture(); }} /> : null,
  };
  const content = screen === 'welcome' ? <WelcomePage feedback={request || issue ? <>
    {request && <><LoadingState title="Đang tạo phiên MOCK…" /><KioskButton variant="outline" size="compact" onClick={cancel}>Cancel</KioskButton></>}
    {issue && <ErrorMessage title="Thông báo phiên" message={issue.message} />}
  </> : undefined} />
    : screen === 'ticket' ? <TicketScanPage verification={controlsFor('ticket')} camera={cameraView} />
    : screen === 'identity' ? <IdentityScanPage verification={controlsFor('identity')} camera={cameraView} />
    : screen === 'face' ? <FaceVerifyPage verification={controlsFor('face')} livenessStatus={session?.livenessStatus} camera={cameraView} />
    : <ResultPage result={session?.finalDecision ? {
      status: session.finalDecision, demo: session.source === 'mock',
      message: session.source === 'mock' ? 'Quyết định do Mock Backend trả về; không có giá trị xác thực hành khách thật.' : 'Quyết định từ dịch vụ xác thực.',
      reason: session.finalDecision === 'FAIL' ? { message: finalReasonForCode(session.errorCode) } : undefined,
    } : null} onStartOver={startOver} />;
  const completedSteps = session ? (['ticket', 'identity', 'face'] as const).filter((step) => stepPassed(session, step)) : [];
  const errorSteps = session && screen !== 'welcome' && screen !== 'result' && issue ? [screen] : [];

  return (
    <KioskLayout
      header={{ status: { status: 'warning', label: 'MOCK / DEMO · Không xác thực thật', announce: false }, onStartOver: screen === 'welcome' && !busy ? undefined : startOver }}
      progress={screen === 'welcome' ? null : { currentStep: screen, completedSteps, errorSteps }}
      footerNote={screen === 'welcome' ? 'MOCK / DEMO · Start tạo phiên mô phỏng. Camera chỉ bật khi bạn chọn; không lưu hoặc gửi hình ảnh.'
        : screen === 'ticket' ? 'MOCK / DEMO · Continue chỉ mở sau Ticket PASSED. Back hủy phiên và về Welcome.'
        : 'MOCK / DEMO · Continue theo kết quả adapter. Back đang khóa; dùng Start Over để tạo luồng mới.'}
      backAction={{ disabled: busy || screen !== 'ticket', onClick: controller.back }}
      continueAction={{
        label: screen === 'welcome' ? 'Start Verification' : request?.kind === 'result' ? 'Đang lấy kết quả MOCK…' : 'Continue',
        loading: screen === 'welcome' && busy || request?.kind === 'result',
        disabled: screen === 'welcome' ? busy : !canContinue(state),
        onClick: () => { void (screen === 'welcome' ? controller.start() : controller.next()); },
      }}
    >
      <div ref={pageRoot} className="kiosk-screen" data-screen={screen}>
        {content}
        {developerControls}
        {screen !== 'welcome' && technicalMode && <aside className="page-technical-slot" aria-label="Thông tin kỹ thuật">
          <LatencyPanel metrics={mapLatency(session?.latency ?? [])} demo={session?.source === 'mock'}
            note="DEMO · Fixture từ adapter, không phải số đo thật. Schema 7 latency chưa được Backend xác nhận." />
          {technicalPanel}
        </aside>}
      </div>
    </KioskLayout>
  );
}
