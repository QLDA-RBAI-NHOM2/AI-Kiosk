import { LoaderCircle } from 'lucide-react';
import type { ComponentPropsWithRef } from 'react';

export type KioskButtonProps = ComponentPropsWithRef<'button'> & {
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'default' | 'compact';
  loading?: boolean;
  loadingLabel?: string;
};

export default function KioskButton({
  variant = 'primary', size = 'default', loading = false, loadingLabel,
  disabled = false, type = 'button', className = '', children, ...props
}: KioskButtonProps) {
  return (
    <button
      {...props}
      type={type}
      className={`kiosk-button button-${variant} button-${size} ${className}`}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
    >
      <span className="button-inner">
        <span className={`button-loading-icon${loading ? ' is-loading' : ''}`} aria-hidden="true">
          <LoaderCircle className={loading ? 'ui-spinner' : undefined} size={22} />
        </span>
        <span className="button-copy">
          <span className={`button-label${loading && loadingLabel ? ' button-label-hidden' : ''}`} aria-hidden={loading && loadingLabel ? true : undefined}>{children}</span>
          {loadingLabel && <span className={`button-loading-label${loading ? ' is-loading' : ''}`} aria-hidden={!loading}>{loadingLabel}</span>}
        </span>
      </span>
    </button>
  );
}
