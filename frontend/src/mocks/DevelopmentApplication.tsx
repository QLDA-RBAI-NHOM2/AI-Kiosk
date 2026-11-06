import { useState } from 'react';
import App from '../App';
import { createMockVerificationApi } from './browser';
import type { MockScenario } from '../api/types';
import { BrowserCameraProvider } from '../camera/BrowserCameraProvider';
import DevelopmentControls from './DevelopmentControls';

/** Chỉ được import khi Vite đang serve development, không nằm trong production bundle. */
export default function DevelopmentApplication() {
  const [configuration, setConfiguration] = useState(() => ({ scenario: 'ALL_PASS' as MockScenario, revision: 0, api: createMockVerificationApi() }));
  const [technical, setTechnical] = useState(false);
  // Singleton ở trên keyed App để không mất acquire queue khi đổi scenario.
  const [cameraProvider] = useState(() => new BrowserCameraProvider());
  return <App key={configuration.revision} api={configuration.api} cameraProvider={cameraProvider} technicalMode={technical}
    developerControls={<DevelopmentControls scenario={configuration.scenario}
      onScenario={(scenario) => setConfiguration((previous) => ({ scenario, revision: previous.revision + 1, api: createMockVerificationApi(scenario) }))}
      technical={technical} onTechnical={setTechnical} />} />;
}
