import { lazy, StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import KioskApplication from './KioskApplication';
import './styles/global.css';

const root = document.getElementById('root');

if (!root) {
  throw new Error('Không tìm thấy phần tử khởi tạo ứng dụng.');
}

// Flag dựa trên Vite command, không bật lại bởi --mode hoặc biến môi trường phía client.
const ComponentPreview = __KIOSK_DEVELOPMENT__ ? lazy(() => import('./pages/ComponentPreview')) : null;

createRoot(root).render(
  <StrictMode>
    <ApplicationEntry />
  </StrictMode>,
);

function ApplicationEntry() {
  if (ComponentPreview && globalThis.location.pathname === '/ui-preview') {
    return <Suspense fallback={<p role="status">Đang mở bộ giao diện…</p>}><ComponentPreview /></Suspense>;
  }
  return <KioskApplication />;
}
