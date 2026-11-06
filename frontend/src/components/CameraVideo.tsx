import { useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { CameraOff } from 'lucide-react';
import type { CameraState } from '../camera/types';

export interface CameraVideoProps {
  camera: CameraState;
  videoRef: RefObject<HTMLVideoElement | null>;
  onReady: (ready: boolean) => void;
}
/** View gắn/tháo srcObject. Quyền stop tracks thuộc CameraProvider. */
export default function CameraVideo({ camera, videoRef, onReady }: CameraVideoProps) {
  const [playbackError, setPlaybackError] = useState(false);
  const failed = useRef(false);
  const attachedStream = useRef<MediaStream | null>(null);
  const stream = camera.stream;
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    let detached = false;
    failed.current = false; attachedStream.current = stream;
    setPlaybackError(false); onReady(false);
    video.srcObject = stream;
    if (stream) void video.play().catch(() => { if (!detached) { failed.current = true; setPlaybackError(true); onReady(false); } });
    return () => {
      detached = true; attachedStream.current = null; onReady(false); video.pause(); video.srcObject = null;
    };
  }, [stream, videoRef, onReady]);

  return <div className="camera-preview" data-camera-status={camera.status}>
    <video ref={videoRef} autoPlay muted playsInline aria-label="Webcam preview cục bộ"
      onPlaying={(event) => {
        const video = event.currentTarget;
        if (!failed.current && attachedStream.current === stream && stream && videoRef.current === video
          && video.srcObject === stream && !video.paused && video.readyState >= 2 && video.videoWidth > 0) onReady(true);
      }}
      onPause={(event) => { if (videoRef.current === event.currentTarget) onReady(false); }}
      onWaiting={() => onReady(false)} onStalled={() => onReady(false)} onEmptied={() => onReady(false)}
      onError={() => { if (stream) { failed.current = true; setPlaybackError(true); onReady(false); } }} />
    {!stream && <div className="camera-preview-placeholder"><CameraOff size={32} aria-hidden="true" />
      <p>{camera.status === 'REQUESTING_PERMISSION' ? 'Đang yêu cầu quyền camera…' : 'Camera chưa bật hoặc chưa khả dụng'}</p></div>}
    {playbackError && <p className="camera-playback-error" role="alert">Không phát được video. Vui lòng dừng rồi bật lại camera.</p>}
  </div>;
}
