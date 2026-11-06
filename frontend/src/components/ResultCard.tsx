import type { ReactNode } from 'react';
import KioskCard from './KioskCard';
import StatusIndicator from './StatusIndicator';
import FailReasonBanner from './FailReasonBanner';

export interface ResultCardProps {
  status: 'PASS' | 'FAIL' | 'PROCESSING';
  title: string;
  message: string;
  reason?: { message: string; code?: string };
  technical?: boolean;
  actions?: ReactNode;
}

export default function ResultCard({ status, title, message, reason, technical = false, actions }: ResultCardProps) {
  const indicator = status === 'PASS' ? 'success' : status === 'FAIL' ? 'failed' : 'processing';
  return (
    <KioskCard className={`result-card result-${status.toLowerCase()}`} aria-label={title}>
      <StatusIndicator status={indicator} label={status === 'PROCESSING' ? 'Đang chờ kết quả' : status} />
      <h3>{title}</h3>
      <p className="result-description">{message}</p>
      {status === 'FAIL' && reason && <FailReasonBanner {...reason} technical={technical} />}
      {actions && <div className="result-actions">{actions}</div>}
    </KioskCard>
  );
}
