import { CameraError, cameraIssue, mapCameraError } from './errors.ts';
import type { CameraEnvironment, CameraMode, CameraProvider, CameraState, CapturedFrame } from './types.ts';
import { captureVideoFrame } from '../utils/captureFrame.ts';

const initialState = (): CameraState => ({ mode: 'IDLE', status: 'IDLE', stream: null, devices: [], selectedDeviceId: null, issue: null });
const browserEnvironment: CameraEnvironment = {
  isSecure: () => globalThis.isSecureContext === true,
  mediaDevices: () => globalThis.navigator?.mediaDevices,
  createCanvas: () => document.createElement('canvas'),
};

/** Owner duy nhất của tracks. Component video chỉ gắn/tháo stream, không stop tracks. */
export class BrowserCameraProvider implements CameraProvider {
  private state = initialState();
  private generation = 0;
  private readonly environment: CameraEnvironment;
  private readonly listeners = new Set<() => void>();
  private pending: { generation: number; deviceId?: string; promise: Promise<boolean> } | null = null;
  private trackCleanups: Array<() => void> = [];
  private deviceCleanup: (() => void) | null = null;
  private captureAbort = new AbortController();
  private ownedStream: MediaStream | null = null;
  private deviceRefresh = 0;

  constructor(environment: CameraEnvironment = browserEnvironment) { this.environment = environment; }
  getCameraStatus = () => this.state;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private update(patch: Partial<CameraState>) { this.state = { ...this.state, ...patch }; this.listeners.forEach((listener) => listener()); }
  private invalidateCapture() { this.captureAbort.abort(); this.captureAbort = new AbortController(); }
  private releaseStream() {
    this.trackCleanups.forEach((cleanup) => cleanup()); this.trackCleanups = [];
    this.deviceCleanup?.(); this.deviceCleanup = null;
    const stream = this.ownedStream; this.ownedStream = null;
    stream?.getTracks().forEach((track) => track.stop());
  }

  switchMode = (mode: CameraMode) => {
    if (mode === 'IDLE') { this.stopCamera(); return; }
    if (mode !== this.state.mode) { this.invalidateCapture(); this.update({ mode }); }
  };

  startCamera = (mode: CameraMode, deviceId?: string): Promise<boolean> => {
    if (mode === 'IDLE') { this.stopCamera(); return Promise.resolve(false); }
    this.switchMode(mode);
    if (this.state.status === 'READY' && (!deviceId || deviceId === this.state.selectedDeviceId)) return Promise.resolve(true);
    if (this.pending?.generation === this.generation && this.pending.deviceId === deviceId) return this.pending.promise;
    const previous = this.pending?.promise;
    const generation = ++this.generation;
    this.invalidateCapture(); this.releaseStream();
    const promise = this.acquire(generation, deviceId, previous);
    this.pending = { generation, deviceId, promise };
    this.update({ stream: null, status: 'REQUESTING_PERMISSION', issue: null, selectedDeviceId: deviceId ?? null });
    return promise;
  };

  private async acquire(generation: number, deviceId: string | undefined, previous?: Promise<boolean>): Promise<boolean> {
    // Serialize getUserMedia, kể cả promise xin quyền cũ không thể abort được.
    await previous;
    if (generation !== this.generation) return false;
    try {
      if (!this.environment.isSecure()) throw new CameraError('INSECURE_CONTEXT');
      const media = this.environment.mediaDevices();
      if (!media?.getUserMedia) throw new CameraError('UNSUPPORTED');
      const stream = await media.getUserMedia({
        audio: false, video: { width: { ideal: 1280 }, height: { ideal: 720 }, ...(deviceId ? { deviceId: { exact: deviceId } } : {}) },
      });
      if (generation !== this.generation || this.state.mode === 'IDLE') {
        stream.getTracks().forEach((track) => track.stop()); return false;
      }
      this.ownedStream = stream; // Ownership bắt đầu trước metadata/listeners có thể ném lỗi.
      const videoTracks = stream.getVideoTracks();
      if (!videoTracks.length || videoTracks.some((track) => track.readyState !== 'live')) {
        throw new CameraError('NO_DEVICE');
      }
      const disconnected = () => {
        if (this.state.stream !== stream) return;
        ++this.generation; this.invalidateCapture(); this.releaseStream();
        this.update({ stream: null, status: 'DISCONNECTED', issue: cameraIssue('DISCONNECTED') });
      };
      videoTracks.forEach((track) => {
        track.addEventListener('ended', disconnected);
        this.trackCleanups.push(() => track.removeEventListener('ended', disconnected));
      });
      const refreshDevices = () => { void this.refreshDevices(media, generation); };
      media.addEventListener('devicechange', refreshDevices);
      this.deviceCleanup = () => media.removeEventListener('devicechange', refreshDevices);
      let selectedDeviceId = deviceId ?? null;
      try { selectedDeviceId = videoTracks[0]?.getSettings?.().deviceId ?? selectedDeviceId; } catch { /* Metadata tùy chọn không làm hỏng preview. */ }
      this.update({ stream, status: 'READY', selectedDeviceId, issue: null });
      void this.refreshDevices(media, generation);
      return generation === this.generation;
    } catch (error) {
      if (generation === this.generation) { this.releaseStream(); this.update({ ...mapCameraError(error), stream: null }); }
      return false;
    } finally {
      if (this.pending?.generation === generation) this.pending = null;
    }
  }

  private async refreshDevices(media: NonNullable<ReturnType<CameraEnvironment['mediaDevices']>>, generation: number) {
    const refresh = ++this.deviceRefresh;
    try {
      const devices = await media.enumerateDevices();
      if (generation === this.generation && refresh === this.deviceRefresh) this.update({ devices: devices.filter((device) => device.kind === 'videoinput')
        .map((device, index) => ({ deviceId: device.deviceId, label: device.label || `Camera ${index + 1}` })) });
    } catch { /* Không lấy được danh sách không có nghĩa stream đang chạy bị lỗi. */ }
  }

  stopCamera = () => {
    ++this.generation; this.invalidateCapture(); this.releaseStream();
    this.state = initialState(); this.listeners.forEach((listener) => listener());
  };

  captureFrame = async (video: HTMLVideoElement, signal?: AbortSignal): Promise<CapturedFrame> => {
    const source = this.state.stream;
    if (this.state.status !== 'READY' || !source || this.state.mode === 'IDLE' || video.srcObject !== source
      || !source.getVideoTracks().some((track) => track.readyState === 'live')) throw new CameraError('CAMERA_NOT_ACTIVE');
    const abort = new AbortController();
    const onAbort = () => abort.abort();
    const scope = this.captureAbort.signal;
    if (scope.aborted || signal?.aborted) abort.abort();
    scope.addEventListener('abort', onAbort, { once: true }); signal?.addEventListener('abort', onAbort, { once: true });
    try {
      const frame = await captureVideoFrame(video, this.environment.createCanvas, abort.signal);
      if (abort.signal.aborted || this.state.stream !== source) throw new CameraError('CAPTURE_CANCELLED');
      return frame;
    }
    finally { scope.removeEventListener('abort', onAbort); signal?.removeEventListener('abort', onAbort); }
  };
}
