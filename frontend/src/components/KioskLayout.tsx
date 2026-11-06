import { ArrowLeft, ArrowRight, Info } from 'lucide-react';
import type { ReactNode } from 'react';
import KioskHeader from './KioskHeader';
import type { KioskHeaderProps } from './KioskHeader';
import KioskButton from './KioskButton';
import StepProgress from './StepProgress';
import type { StepProgressProps } from './StepProgress';

export interface KioskNavigationAction {
  label?: string;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
}

export interface KioskLayoutProps {
  children: ReactNode;
  header?: KioskHeaderProps;
  progress?: StepProgressProps | null;
  footerNote?: ReactNode;
  backAction?: KioskNavigationAction;
  continueAction?: KioskNavigationAction;
}

export default function KioskLayout({
  children, header, progress = null,
  footerNote = 'Bản xem trước — chưa thực hiện xác thực hoặc chuyển bước.',
  backAction = {}, continueAction = {},
}: KioskLayoutProps) {
  return (
    <div className="kiosk-shell">
      <a className="skip-link" href="#main-content">Chuyển đến nội dung chính</a>
      <KioskHeader {...header} />
      {progress && <StepProgress {...progress} />}
      <main id="main-content" className="kiosk-main" tabIndex={-1}>
        {children}
      </main>
      <footer className="kiosk-footer">
        <p id="navigation-note" className="footer-note">
          <Info size={17} aria-hidden="true" />
          {footerNote}
        </p>
        <div className="footer-actions">
          <KioskButton
            variant="secondary" className="footer-button" disabled={backAction.disabled ?? !backAction.onClick}
            loading={backAction.loading} onClick={backAction.onClick} aria-describedby="navigation-note"
          >
            <ArrowLeft size={23} aria-hidden="true" />
            {backAction.label ?? 'Back'}
          </KioskButton>
          <KioskButton
            className="footer-button" disabled={continueAction.disabled ?? !continueAction.onClick}
            loading={continueAction.loading} onClick={continueAction.onClick} aria-describedby="navigation-note"
          >
            {continueAction.label ?? 'Continue'}
            <ArrowRight size={23} aria-hidden="true" />
          </KioskButton>
        </div>
      </footer>
    </div>
  );
}
