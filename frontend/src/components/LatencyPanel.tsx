import { ChevronDown, Timer } from 'lucide-react';
import { useId, useState } from 'react';

export interface LatencyMetric {
  id: string;
  label: string;
  valueMs: number | null | undefined;
}

export interface LatencyPanelProps {
  metrics: readonly LatencyMetric[];
  demo?: boolean;
  defaultOpen?: boolean;
  note?: string;
}

const numberFormat = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 });

export default function LatencyPanel({ metrics, demo = false, defaultOpen = false, note }: LatencyPanelProps) {
  const [expanded, setExpanded] = useState(defaultOpen);
  const contentId = useId();
  return (
    <section className="latency-panel">
      <button type="button" className="latency-toggle" aria-expanded={expanded} aria-controls={contentId} onClick={() => setExpanded(!expanded)}>
        <span><Timer size={21} aria-hidden="true" />Thời gian xử lý</span>
        <span>{demo && <span className="demo-badge">DEMO</span>}<ChevronDown size={20} className={expanded ? 'chevron-open' : ''} aria-hidden="true" /></span>
      </button>
      <div id={contentId} hidden={!expanded} className="latency-content">
        {note && <p className="latency-note">{note}</p>}
        {metrics.length === 0 ? <p className="empty-metrics">Chưa có số đo.</p> : (
          <table className="latency-table">
            <caption className="sr-only">Thời gian xử lý từng chỉ số, đơn vị milliseconds</caption>
            <thead><tr><th scope="col">Chỉ số</th><th scope="col">Thời gian</th></tr></thead>
            <tbody>
              {metrics.map(({ id, label, valueMs }) => (
                <tr key={id}>
                  <th scope="row">{label}</th>
                  <td>
                    {valueMs === null ? 'Chưa có số đo' : valueMs === undefined ? 'Chưa được cung cấp' : Number.isFinite(valueMs) && valueMs >= 0
                      ? <>{numberFormat.format(valueMs)} <span className="metric-unit">ms</span></>
                      : 'Không hợp lệ'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
