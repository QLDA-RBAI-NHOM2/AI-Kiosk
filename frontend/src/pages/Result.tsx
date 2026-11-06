import { RotateCcw } from 'lucide-react';
import KioskButton from '../components/KioskButton';
import ResultCard from '../components/ResultCard';
import StatusIndicator from '../components/StatusIndicator';

/** View model hiển thị, không phải DTO hoặc luật quyết định của Backend. */
export interface KioskResultView {
  status: 'PASS' | 'FAIL';
  message: string;
  demo: boolean;
  reason?: { message: string; code?: string };
}

export interface ResultPageProps {
  result?: KioskResultView | null;
  onStartOver: () => void;
}

export default function ResultPage({ result = null, onStartOver }: ResultPageProps) {
  return (
    <section className="kiosk-page result-page" aria-labelledby="result-title">
      <p className="screen-eyebrow">BƯỚC 04 · KẾT QUẢ</p>
      <h1 id="result-title" tabIndex={-1}>Verification Result</h1>
      <p className="page-intro">Kết quả xác thực được hiển thị khi có dữ liệu được cung cấp.</p>
      <div className="page-result-content">
        {result?.demo && <StatusIndicator status="warning" label="DEMO · Kết quả minh họa, không có giá trị xác thực" announce={false} />}
        <ResultCard
          status={result?.status ?? 'PROCESSING'}
          title={result ? `${result.status}${result.demo ? ' · DEMO' : ''}` : 'Pending — chưa có kết quả'}
          message={result?.message ?? 'Chưa có quyết định cuối từ adapter. Không tự tạo kết quả PASS hoặc FAIL.'}
          reason={result?.reason}
          actions={<KioskButton onClick={onStartOver}><RotateCcw size={22} aria-hidden="true" />Start Over</KioskButton>}
        />
      </div>
    </section>
  );
}
