import { Check, CircleAlert } from 'lucide-react';

export type KioskStepId = 'ticket' | 'identity' | 'face' | 'result';
export type StepStatus = 'upcoming' | 'active' | 'completed' | 'error';

export interface StepProgressProps {
  currentStep: KioskStepId | null;
  completedSteps?: readonly KioskStepId[];
  errorSteps?: readonly KioskStepId[];
  labels?: Partial<Record<KioskStepId, string>>;
  className?: string;
}

const steps = [
  { id: 'ticket', label: 'Scan Ticket', description: 'Quét mã QR vé' },
  { id: 'identity', label: 'Verify Identity', description: 'Xác thực định danh' },
  { id: 'face', label: 'Face & Liveness', description: 'Khuôn mặt & Liveness' },
  { id: 'result', label: 'Result', description: 'Kết quả xác thực' },
] as const;

const statusLabels: Record<StepStatus, string> = {
  upcoming: 'Chưa thực hiện', active: 'Bước hiện tại', completed: 'Đã hoàn tất', error: 'Có lỗi',
};

export default function StepProgress({
  currentStep, completedSteps = [], errorSteps = [], labels, className = '',
}: StepProgressProps) {
  return (
    <nav className={`step-progress ${className}`} aria-label="Các bước xác thực hành khách">
      <ol className="step-list" data-current={currentStep !== null}>
        {steps.map((step, index) => {
          const isCurrent = step.id === currentStep;
          const state: StepStatus = errorSteps.includes(step.id) ? 'error'
            : isCurrent ? 'active' : completedSteps.includes(step.id) ? 'completed' : 'upcoming';
          return (
          <li
            key={step.id}
            className={`step-item step-${state}${isCurrent ? ' step-current' : ''}`}
            data-state={state}
            aria-current={isCurrent ? 'step' : undefined}
          >
            <span className="step-number" aria-hidden="true">
              {state === 'completed' ? <Check size={21} /> : state === 'error' ? <CircleAlert size={21} /> : index + 1}
            </span>
            <div className="min-w-0">
              <p className="step-caption">STEP 0{index + 1}<span className="step-total"> / 04</span></p>
              <p className="step-name">{labels?.[step.id] ?? step.label}</p>
              <p className="step-description">{step.description}</p>
              <span className="sr-only">{statusLabels[state]}</span>
            </div>
          </li>
          );
        })}
      </ol>
    </nav>
  );
}
