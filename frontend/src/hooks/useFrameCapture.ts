import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { CameraError, cameraIssue } from '../camera/errors';
import type { CameraIssue, CameraProvider } from '../camera/types';

export interface FrameMetadata { width: number; height: number; size: number; type: string }

/** UI chỉ giữ metadata. Blob không được đưa vào state, storage, URL hoặc VerificationApi. */
export function useFrameCapture(provider: CameraProvider, scopeKey: string, stream: MediaStream | null) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const generation = useRef(0);
  const pending = useRef<AbortController | null>(null);
  const mounted = useRef(true);
  const [ready, setReady] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [metadata, setMetadata] = useState<FrameMetadata | null>(null);
  const [issue, setIssue] = useState<CameraIssue | null>(null);
  const invalidate = useCallback(() => {
    generation.current++; pending.current?.abort(); pending.current = null;
  }, []);
  useLayoutEffect(() => {
    invalidate(); setReady(false); setCapturing(false); setMetadata(null); setIssue(null);
  }, [invalidate, scopeKey, stream]);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; invalidate(); };
  }, [invalidate]);

  const capture = async () => {
    if (pending.current || !videoRef.current || !ready) return;
    const abort = new AbortController(); pending.current = abort;
    const attempt = ++generation.current;
    setCapturing(true); setIssue(null); setMetadata(null);
    try {
      const frame = await provider.captureFrame(videoRef.current, abort.signal);
      if (mounted.current && generation.current === attempt && !abort.signal.aborted) {
        setMetadata({ width: frame.width, height: frame.height, size: frame.blob.size, type: frame.blob.type });
      }
    } catch (error) {
      if (mounted.current && generation.current === attempt && !abort.signal.aborted) {
        setIssue(cameraIssue(error instanceof CameraError ? error.code : 'CAPTURE_FAILED'));
      }
    } finally {
      if (pending.current === abort) { pending.current = null; if (mounted.current) setCapturing(false); }
    }
  };
  return { videoRef, ready, setReady, capturing, metadata, issue, capture };
}
