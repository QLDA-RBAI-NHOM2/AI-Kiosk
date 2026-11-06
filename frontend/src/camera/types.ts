export type CameraMode = 'TICKET_QR' | 'IDENTITY_QR' | 'FACE' | 'IDLE';
export type CameraStatus = 'IDLE' | 'REQUESTING_PERMISSION' | 'READY' | 'PERMISSION_DENIED' | 'UNAVAILABLE' | 'UNSUPPORTED' | 'DISCONNECTED' | 'ERROR';
export type CameraErrorCode = 'INSECURE_CONTEXT' | 'UNSUPPORTED' | 'PERMISSION_DENIED' | 'NO_DEVICE' | 'DEVICE_BUSY'
  | 'CONSTRAINTS_UNAVAILABLE' | 'DISCONNECTED' | 'CAMERA_ERROR' | 'CAMERA_NOT_ACTIVE' | 'CAPTURE_NOT_READY' | 'CAPTURE_CANCELLED' | 'CAPTURE_FAILED';
export interface CameraIssue { code: CameraErrorCode; message: string }
export interface CameraDevice { deviceId: string; label: string }
export interface CameraState {
  mode: CameraMode; status: CameraStatus; stream: MediaStream | null;
  devices: readonly CameraDevice[]; selectedDeviceId: string | null; issue: CameraIssue | null;
}
export interface CapturedFrame { blob: Blob; width: number; height: number }
export interface CameraProvider {
  startCamera(mode: CameraMode, deviceId?: string): Promise<boolean>;
  stopCamera(): void;
  switchMode(mode: CameraMode): void;
  captureFrame(video: HTMLVideoElement, signal?: AbortSignal): Promise<CapturedFrame>;
  getCameraStatus(): CameraState;
  subscribe(listener: () => void): () => void;
}
/** Browser seam cho provider; không phụ thuộc React hoặc VerificationApi. */
export interface CameraEnvironment {
  isSecure(): boolean;
  mediaDevices(): (EventTarget & Pick<MediaDevices, 'getUserMedia' | 'enumerateDevices'>) | undefined;
  createCanvas(): HTMLCanvasElement;
}
