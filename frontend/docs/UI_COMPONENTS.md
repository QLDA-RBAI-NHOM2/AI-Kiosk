# UI Components — bàn giao Bước 2.2

> Bước 2.5 bổ sung CameraVideo/CameraControls và dùng children slot hiện có của CameraFrame; xem [CAMERA_INTEGRATION](CAMERA_INTEGRATION.md). CameraView vẫn re-export cùng khung, không mở stream riêng.

> Từ Bước 2.4, luồng chính sử dụng [Verification Session MOCK](VERIFICATION_SESSION.md). Bộ component vẫn thuần trình bày; VerificationStepControls được bổ sung để hiển thị action/status do controller cấp.

Tài liệu mô tả implementation hiện tại; sáu tài liệu khảo sát Giai đoạn 1 vẫn giữ nguyên như bản ghi lịch sử. Phong cách và token kế thừa từ [UI_DESIGN_SYSTEM](UI_DESIGN_SYSTEM.md). Không có camera thật, API, Mock API, phiên xác thực, thuật toán AI hoặc quyết định nghiệp vụ trong bộ component này.

## Chạy và mở preview

Tại `C:\QLDA_RBAI\frontend`, chạy `npm run dev`, mở `http://127.0.0.1:5173/ui-preview`. Ở mốc Bước 2.2, trang `/` là màn quét vé tĩnh của Bước 2.1, đã dùng component chung. Từ Bước 2.3, `/` bắt đầu tại Welcome và đi qua năm màn bằng điều hướng Preview; xem [KIOSK_SCREENS](KIOSK_SCREENS.md). Phần kiểm chứng bên dưới ghi nhận mốc bàn giao Bước 2.2.

Từ Bước 2.6, preview được lazy import trong `src/main.tsx` chỉ khi `__KIOSK_DEVELOPMENT__` do Vite command serve (không preview) cấu hình. Mọi build đều loại gallery và mock application; `/ui-preview` trên production hiển thị SERVICE_UNAVAILABLE khi chưa có Backend. Đây là giới hạn đóng gói development, không thay thế xác thực/phân quyền Backend. Các kiểm chứng 2.2 phía dưới là bản ghi lịch sử; chính sách hiện tại tại [FRONTEND_HANDOVER](FRONTEND_HANDOVER.md).

Mọi số liệu và kết quả gallery đều ghi DEMO. Các nút tương tác chỉ cập nhật bộ đếm/cấu hình hiển thị tại chỗ; Retry không tự chuyển thành PASS và Start Over không hủy phiên thật.

## Component và hợp đồng props

Các đường dẫn dưới đây tính từ `src/components/`. Props TypeScript được export trong từng file.

| Component | Props chính | Hành vi và giới hạn |
| --- | --- | --- |
| `KioskButton.tsx` | Native button props, `variant`, `size`, `loading`, `loadingLabel` | Primary/secondary/outline; mặc định `type="button"`; disabled hoặc loading không gọi callback; giữ chỗ spinner/nhãn để không đổi bề rộng khi loading; hỗ trợ ref, keyboard và focus |
| `KioskCard.tsx` | Native section attributes, `heading`, `description`, `variant`, children | Default/muted, heading id riêng, không có logic nghiệp vụ |
| `StatusIndicator.tsx` | `status`, `label`, `announce`, `className` | idle/processing/success/failed/warning/error; icon + text + màu. `announce=false` cho mẫu hoặc thông tin tĩnh để tránh đọc lặp |
| `LoadingState.tsx` | `title`, `description`, `className` | Spinner nhẹ, thông điệp chờ; không có timer tự thành công; tôn trọng reduced motion |
| `ErrorMessage.tsx` | `title`, `message`, `code`, `technical`, `onRetry`, `retryLabel`, `retryLoading` | Chỉ truyền thông điệp đã được chọn an toàn. Code ẩn mặc định; Retry chỉ gọi callback được cấp |
| `KioskHeader.tsx` | `title`, `subtitle`, `status`, `onStartOver`, `startOverDisabled` | Biểu tượng riêng; status do bên gọi truyền; Start Over chỉ có khi được cấp callback; không tự gọi hủy phiên |
| `KioskLayout.tsx` | children, `header`, `progress`, `backAction`, `continueAction`, `footerNote` | Header/step/main/footer trong luồng layout; skip link; mặc định nút disabled khi chưa có callback; `progress=null` dùng cho Welcome |
| `StepProgress.tsx` | `currentStep`, `completedSteps`, `errorSteps`, `labels` | Luôn 4 bước; không click nhảy bước. Bước hiện tại có `aria-current`; không suy ra completed từ index |
| `CameraFrame.tsx` | `label`, children, `overlay`, `placeholder`, `status`, `className` | Frame/placeholder/video slot. Không gọi getUserMedia, không sở hữu stream hoặc suy ra camera đang hoạt động từ overlay |
| `CameraView.tsx` | Alias của CameraFrame và CameraFrameProps | Giữ điểm import có từ bộ khung; re-export cùng implementation, không tạo camera manager thứ hai |
| `OvalGuide.tsx` | `className` | SVG ellipse, mask id riêng cho mỗi instance, giữ tỷ lệ khi resize; thuần hướng dẫn, không phát hiện mặt |
| `QrScanFrame.tsx` | children, `className` | Khung góc vuông, có thể chứa minh họa; không đọc QR; overlay không nhận pointer event |
| `FailReasonBanner.tsx` | ErrorMessage props, title tùy chọn | Dùng chung ErrorMessage, không quyết định FAIL hoặc map mã Backend chưa chốt |
| `ResultCard.tsx` | `status`, `title`, `message`, `reason`, `technical`, `actions` | Nhận PASS/FAIL/PROCESSING trực tiếp; không tạo kết quả từ module/threshold; không tự Retry |
| `LatencyPanel.tsx` | `metrics`, `demo`, `defaultOpen`, `note` | Danh sách động; state cục bộ chỉ để mở/đóng; không hardcode schema 7 trường, không tính tổng hoặc tự đo |

`ErrorBoundary.tsx` và `ManualTicketInput.tsx` vẫn là placeholder được giữ nguyên: error boundary runtime và nhập vé thủ công không thuộc danh sách triển khai Bước 2.2. Hooks/API/state/pages nghiệp vụ khác chưa được điền.

## State của StepProgress

Step id: `ticket | identity | face | result`. `currentStep=null` biểu thị chưa có bước hiện tại, phù hợp Welcome. `labels` ghi đè nhãn, ví dụ `{ ticket: 'Quét vé', identity: 'Định danh', face: 'Khuôn mặt', result: 'Kết quả' }`.

Khi props trùng nhau, thứ tự trình bày là `error > active > completed > upcoming`. `aria-current` vẫn chỉ vị trí hiện tại kể cả bước đang lỗi. `completedSteps` là dữ liệu bên gọi cung cấp; component không tự đánh dấu bước trước đã xác thực thành công. Mobile chỉ hiển thị bước hiện tại và số thứ tự /04, giữ các bước khác trong danh sách trợ năng; nếu currentStep=null thì hiển thị toàn bộ bước.

## Camera UI và nội dung hành khách

CameraFrame có thể nhận `<video>` trong children ở bước tích hợp sau; bên gọi chịu trách nhiệm cung cấp và giải phóng nguồn. Overlay là slot trình bày dùng chung; không có acquire, capture hoặc permission request. Oval dùng viewBox và preserveAspectRatio, không kéo giãn ellipse theo container. QrScanFrame giữ vùng vuông. Văn bản hướng dẫn/trạng thái nằm ngoài overlay, không che vùng mặt/mã.

`message`/`label` là chuỗi hiển thị an toàn do bên gọi chọn; không đưa raw exception, stack, QR, CCCD hoặc secret vào props. `technical=true` chỉ là điều kiện render code, **không phải kiểm soát truy cập**. Sau này lớp tích hợp phải kiểm tra quyền trước khi cấp dữ liệu kỹ thuật. LatencyPanel chỉ được lắp trong vùng kỹ thuật có quyền; hiện tại chỉ preview development sử dụng panel.

## Latency và dữ liệu thiếu

Mỗi metric có `{ id: string, label: string, valueMs: number | null | undefined }`. ID phải duy nhất trong cùng panel. Component không tự đặt tên field Backend và không cộng `total_ms` từ các dòng khác.

- `0` hiển thị `0 ms`, không bị hiểu là thiếu dữ liệu.
- Từ Bước 2.4, `null` hiển thị “Chưa có số đo”; `undefined` hiển thị “Chưa được cung cấp” để phân biệt hai loại dữ liệu thiếu. Mốc 2.2 trước đây dùng chung một nhãn.
- Số âm, NaN hoặc Infinity hiển thị “Không hợp lệ”.
- Mảng rỗng có empty state; table/controls mở đóng bằng keyboard.
- `demo=true` hiển thị nhãn DEMO; mẫu trong gallery không phải số đo thật.

Gallery dùng ba tên đã xuất hiện trong Excel, với giá trị giả; field “Chỉ số bổ sung (DEMO)” chỉ minh họa danh sách động và giá trị không hợp lệ, không phải tên trường thứ tư được xác nhận. Bộ 7 chính thức vẫn cần Backend chốt theo [API_INTEGRATION_PLAN](API_INTEGRATION_PLAN.md).

## Design tokens và responsive

Chỉ mở rộng `src/styles/global.css`: primary/pressed, accent/accent text, surface/background/text, border/control border, success/danger/warning và disabled. Không thêm palette hoặc thư viện UI mới. Font vẫn là Inter nếu sẵn có, rồi Segoe UI/Arial; không tải font từ Internet.

Nút thường tối thiểu 72 px; compact tối thiểu 48 px; focus tương phản; trạng thái luôn có icon/chữ. Footer nằm trong document flow. Gallery có cuộn dọc chủ động vì chứa toàn bộ ví dụ. Màn kiosk `/` phải vừa Full HD và 1366×768; mobile cho phép cuộn, CTA xếp dọc.

## Kiểm chứng và giai đoạn tiếp theo

Đã kiểm TypeScript/build/lint, browser responsive, callback/loading/disabled, Retry, props điều khiển step, latency 0/null/invalid, toggle bằng bàn phím, reduced motion và tỷ lệ oval. Màn kiosk `/` vừa 1920×1080 và 1366×768; mobile 390 px cuộn dọc, không tràn ngang hoặc che footer. Gallery dài có cuộn dọc ở mọi kích thước. Đã rà ảnh thực tế ở desktop/mobile và điều chỉnh gallery nút mobile thành một cột để tránh ngắt từ.

Đã kiểm production tại `/` và `/ui-preview`: đều hiển thị App hành khách; JS bundle không có ComponentPreview hoặc fixture DEMO. Bộ kiểm tra hành vi tạm dùng Playwright đi kèm môi trường, không thêm dependency vào project. Lượt review độc lập không có lỗi quan trọng; đã sửa hai điểm nhỏ về thông báo loading cho trợ năng và ổn định kích thước nút.

File mới: `src/components/{KioskButton,KioskCard,StatusIndicator,LoadingState,ErrorMessage,CameraFrame}.tsx`, `src/pages/ComponentPreview.tsx`, tài liệu này.

File sửa trong Bước 2.2: `src/{App,main}.tsx`, `src/styles/global.css`, `src/components/{KioskHeader,KioskLayout,StepProgress,CameraView,OvalGuide,QrScanFrame,FailReasonBanner,ResultCard,LatencyPanel}.tsx`. Manifest, lockfile, build config, reference, sáu tài liệu cũ và các placeholder ngoài phạm vi giữ nguyên.

Bước 2.3 được đề xuất là ghép các màn Welcome/Ticket/Identity/Face/Result từ bộ component này, quản lý trạng thái giao diện ở lớp page. Camera/API/Mock/Rule Engine chỉ triển khai khi được giao ở bước phù hợp; đợt này chưa thực hiện Bước 2.3.
