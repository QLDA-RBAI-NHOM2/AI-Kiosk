import KioskLayout from '../components/KioskLayout';
import KioskCard from '../components/KioskCard';
import ErrorMessage from '../components/ErrorMessage';

/** Không mount App/session/camera/result khi production chưa có dịch vụ xác thực. */
export default function ServiceUnavailablePage({ message }: { message: string }) {
  return <KioskLayout
    header={{ subtitle: 'Xác thực hành khách', status: { status: 'warning', label: 'Dịch vụ chưa kết nối', announce: false } }}
    progress={null}
    footerNote="Vui lòng liên hệ nhân viên hỗ trợ để được hướng dẫn xác thực."
    backAction={{ disabled: true }} continueAction={{ label: 'Bắt đầu xác thực', disabled: true }}
  >
    <section className="kiosk-page result-page" aria-labelledby="unavailable-title" data-service-status="SERVICE_UNAVAILABLE">
      <p className="screen-eyebrow">AIRPORT AI VERIFICATION KIOSK</p>
      <h1 id="unavailable-title" tabIndex={-1}>Dịch vụ xác thực chưa sẵn sàng</h1>
      <div className="page-result-content">
        <KioskCard><ErrorMessage title="Chưa thể bắt đầu xác thực" message={message} /></KioskCard>
      </div>
    </section>
  </KioskLayout>;
}
