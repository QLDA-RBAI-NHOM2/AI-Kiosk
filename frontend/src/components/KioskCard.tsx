import { useId } from 'react';
import type { HTMLAttributes } from 'react';

export interface KioskCardProps extends HTMLAttributes<HTMLElement> {
  heading?: string;
  description?: string;
  variant?: 'default' | 'muted';
}

export default function KioskCard({
  heading, description, variant = 'default', className = '', children, ...props
}: KioskCardProps) {
  const headingId = useId();
  return (
    <section
      aria-labelledby={heading ? headingId : undefined}
      {...props}
      className={`kiosk-card card-${variant} ${className}`}
    >
      {heading && <h2 id={headingId} className="card-heading">{heading}</h2>}
      {description && <p className="card-description">{description}</p>}
      {children}
    </section>
  );
}
