import ErrorMessage from './ErrorMessage';
import type { ErrorMessageProps } from './ErrorMessage';

export type FailReasonBannerProps = Omit<ErrorMessageProps, 'title'> & { title?: string };

export default function FailReasonBanner({ title = 'Lý do chưa thể xác thực', ...props }: FailReasonBannerProps) {
  return <ErrorMessage title={title} {...props} />;
}
