import { useEffect, useState, useSyncExternalStore } from 'react';
import type { VerificationApi } from '../api/adapter';
import { VerificationController } from '../state/VerificationController';

/** Adapter được cấp ở composition root; hook không chọn mock/live hoặc gọi URL. */
export function useSession(api: VerificationApi) {
  const [controller] = useState(() => new VerificationController(api));
  const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot);
  useEffect(() => () => controller.dispose(), [controller]);
  return { state, controller };
}
