import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import { BrowserCameraProvider } from '../camera/BrowserCameraProvider';
import type { CameraMode, CameraProvider } from '../camera/types';

export interface CameraSessionScope { sessionId: string | null; active: boolean; mode: CameraMode }

/** Một provider cho toàn App. Không xin quyền từ effect hoặc page. */
export function useCamera(scope: CameraSessionScope, suppliedProvider?: CameraProvider) {
  const [provider] = useState<CameraProvider>(() => suppliedProvider ?? new BrowserCameraProvider());
  const state = useSyncExternalStore(provider.subscribe, provider.getCameraStatus, provider.getCameraStatus);
  const previousSession = useRef<string | null>(null);
  useLayoutEffect(() => {
    if (previousSession.current !== scope.sessionId || !scope.active || scope.mode === 'IDLE') provider.stopCamera();
    if (scope.active && scope.sessionId && scope.mode !== 'IDLE') provider.switchMode(scope.mode);
    previousSession.current = scope.sessionId;
  }, [provider, scope.sessionId, scope.active, scope.mode]);
  useEffect(() => {
    const stop = () => provider.stopCamera();
    globalThis.addEventListener('pagehide', stop);
    return () => { globalThis.removeEventListener('pagehide', stop); provider.stopCamera(); };
  }, [provider]);
  return {
    provider, state,
    startCamera: (deviceId?: string) => scope.active && scope.sessionId && scope.mode !== 'IDLE'
      ? provider.startCamera(scope.mode, deviceId) : Promise.resolve(false),
    stopCamera: provider.stopCamera,
  };
}
