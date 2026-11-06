import { CameraError } from '../camera/errors.ts';
import type { CapturedFrame } from '../camera/types.ts';

export interface FrameCaptureOptions { maxWidth?: number; maxHeight?: number; mimeType?: 'image/jpeg' | 'image/webp'; quality?: number }

/** Capture một lần do người gọi yêu cầu; không upload, lưu, tạo URL hoặc giữ canvas sau callback. */
export function captureVideoFrame(video: HTMLVideoElement, createCanvas: () => HTMLCanvasElement,
  signal?: AbortSignal, options: FrameCaptureOptions = {}): Promise<CapturedFrame> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) { reject(new CameraError('CAPTURE_CANCELLED')); return; }
    if (video.readyState < 2 || video.videoWidth <= 0 || video.videoHeight <= 0) {
      reject(new CameraError('CAPTURE_NOT_READY')); return;
    }
    let canvas: HTMLCanvasElement | null = null;
    let finished = false;
    const cleanup = () => { signal?.removeEventListener('abort', onAbort); if (canvas) { canvas.width = 0; canvas.height = 0; } };
    const fail = (code: 'CAPTURE_CANCELLED' | 'CAPTURE_FAILED') => { if (!finished) { finished = true; cleanup(); reject(new CameraError(code)); } };
    const onAbort = () => fail('CAPTURE_CANCELLED');
    signal?.addEventListener('abort', onAbort, { once: true });
    try {
      const maxWidth = Math.max(1, Math.min(1280, options.maxWidth ?? 1280));
      const maxHeight = Math.max(1, Math.min(720, options.maxHeight ?? 720));
      const scale = Math.min(1, maxWidth / video.videoWidth, maxHeight / video.videoHeight);
      const width = Math.max(1, Math.floor(video.videoWidth * scale));
      const height = Math.max(1, Math.floor(video.videoHeight * scale));
      canvas = createCanvas(); canvas.width = width; canvas.height = height;
      const context = canvas.getContext('2d');
      if (!context) { fail('CAPTURE_FAILED'); return; }
      context.drawImage(video, 0, 0, width, height);
      canvas.toBlob((blob) => {
        if (finished) return;
        if (!blob || blob.size === 0) { fail('CAPTURE_FAILED'); return; }
        finished = true; cleanup(); resolve({ blob, width, height });
      }, options.mimeType ?? 'image/jpeg', Math.max(0.1, Math.min(1, options.quality ?? 0.82)));
    } catch { fail('CAPTURE_FAILED'); }
  });
}
