import type { MockScenario } from '../api/types';
import { useId } from 'react';

const scenarios: readonly MockScenario[] = ['ALL_PASS', 'INVALID_TICKET', 'IDENTITY_MISMATCH', 'FACE_MISMATCH',
  'LIVENESS_FAILED', 'REQUEST_TIMEOUT', 'NETWORK_ERROR', 'SESSION_CANCELLED'];

export default function DevelopmentControls({ scenario, onScenario, technical, onTechnical }: {
  scenario: MockScenario; onScenario: (value: MockScenario) => void;
  technical: boolean; onTechnical: (value: boolean) => void;
}) {
  const scenarioId = useId();
  return <details className="development-controls">
    <summary>Development · MOCK controls</summary>
    <div className="development-fields">
      <div className="scenario-field"><label htmlFor={scenarioId}>Mock scenario</label><select id={scenarioId} value={scenario} onChange={(event) => onScenario(event.target.value as MockScenario)}>
        {scenarios.map((value) => <option key={value} value={value}>{value}</option>)}
      </select></div>
      <label className="technical-checkbox"><input type="checkbox" checked={technical} onChange={(event) => onTechnical(event.target.checked)} />Technical Mode · DEMO</label>
    </div>
    <p>Đổi scenario sẽ hủy và reset phiên. Retry lặp lại cùng kịch bản deterministic. Điều khiển này chỉ có trong development.</p>
  </details>;
}
