import { lazy, Suspense } from 'react';
import { UnavailableVerificationApi } from './api/UnavailableVerificationApi';
import ServiceUnavailablePage from './pages/ServiceUnavailable';

const DevelopmentApplication = __KIOSK_DEVELOPMENT__ ? lazy(() => import('./mocks/DevelopmentApplication')) : null;
const productionApi = new UnavailableVerificationApi();

/** Production fail-closed. Không có URL/storage/VITE_* override để bật MOCK. */
export default function KioskApplication() {
  if (DevelopmentApplication) return <Suspense fallback={<p role="status">Đang mở môi trường phát triển…</p>}><DevelopmentApplication /></Suspense>;
  return <ServiceUnavailablePage message={productionApi.availability.message} />;
}
