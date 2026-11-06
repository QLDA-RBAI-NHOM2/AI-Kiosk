import { LoaderCircle } from 'lucide-react';

export interface LoadingStateProps {
  title?: string;
  description?: string;
  className?: string;
}

export default function LoadingState({
  title = 'Đang xử lý', description = 'Vui lòng chờ phản hồi.', className = '',
}: LoadingStateProps) {
  return (
    <div className={`loading-state ${className}`} role="status">
      <LoaderCircle size={36} className="ui-spinner" aria-hidden="true" />
      <div><h3>{title}</h3><p>{description}</p></div>
    </div>
  );
}
