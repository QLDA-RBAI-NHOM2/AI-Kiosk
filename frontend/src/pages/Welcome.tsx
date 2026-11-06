import { IdCard, ListChecks, Plane, QrCode, ScanFace, Ticket } from 'lucide-react';
import KioskCard from '../components/KioskCard';
import type { ReactNode } from 'react';

const overview = [
  { icon: Ticket, title: 'Quét vé', description: 'Chuẩn bị mã QR vé' },
  { icon: IdCard, title: 'Định danh', description: 'Quét mã QR định danh' },
  { icon: ScanFace, title: 'Khuôn mặt', description: 'Làm theo hướng dẫn' },
  { icon: ListChecks, title: 'Kết quả', description: 'Xem trạng thái xác thực' },
] as const;

export default function WelcomePage({ feedback }: { feedback?: ReactNode }) {
  return (
    <section className="kiosk-page welcome-page" aria-labelledby="welcome-title">
      <p className="screen-eyebrow">CHÀO MỪNG BẠN</p>
      <h1 id="welcome-title" tabIndex={-1}>Airport AI Verification Kiosk</h1>
      <p className="page-intro">Quy trình xác thực hành khách trong bốn bước đơn giản.</p>
      <div className="welcome-illustration" aria-hidden="true">
        <span className="welcome-route" />
        <span className="welcome-plane"><Plane size={64} strokeWidth={1.5} /></span>
        <div className="welcome-boarding-pass">
          <QrCode size={58} strokeWidth={1.4} />
          <div><span>BOARDING PASS</span><i /><i /></div>
        </div>
      </div>
      <ol className="welcome-overview" aria-label="Giới thiệu quy trình bốn bước">
        {overview.map(({ icon: Icon, title, description }, index) => (
          <li key={title}>
            <KioskCard className="welcome-step">
              <div><Icon size={26} aria-hidden="true" /><span>0{index + 1}</span></div>
              <h2>{title}</h2><p>{description}</p>
            </KioskCard>
          </li>
        ))}
      </ol>
      <p className="preview-disclaimer">MOCK / DEMO · Xác thực bằng kịch bản. Camera chỉ bật khi bạn chọn, không lưu hoặc gửi hình ảnh; kết quả không có giá trị xác thực thật.</p>
      {feedback && <div className="welcome-feedback">{feedback}</div>}
    </section>
  );
}
