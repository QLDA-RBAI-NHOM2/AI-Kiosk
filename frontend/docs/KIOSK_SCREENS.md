# Màn hình Kiosk — bàn giao Bước 2.3

> Từ Bước 2.6, các màn MOCK/camera chỉ chạy trong development; production chưa có Backend hiển thị SERVICE_UNAVAILABLE. Xem [FRONTEND_HANDOVER](FRONTEND_HANDOVER.md). Các mô tả/QA production dưới đây là lịch sử mốc 2.3.

> Bản ghi tại mốc 2.3. Từ Bước 2.4, App đã dùng controller/session và guards MOCK thay cho previewIndex. Xem [VERIFICATION_SESSION](VERIFICATION_SESSION.md) để chạy phiên bản hiện tại; các mô tả điều hướng Preview dưới đây giữ lại để truy vết.

## Phạm vi và nguồn

Triển khai năm màn hình dựa trên [UX_FLOW](UX_FLOW.md), [UI_DESIGN_SYSTEM](UI_DESIGN_SYSTEM.md), [FRONTEND_ARCHITECTURE](FRONTEND_ARCHITECTURE.md), [UI_COMPONENTS](UI_COMPONENTS.md), [API_INTEGRATION_PLAN](API_INTEGRATION_PLAN.md) và ảnh JPG trong references.

Yêu cầu Bước 2.3 cho phép Continue để **xem trước màn hình** dù chưa xác thực. Đây là phạm vi khác với điều kiện chuyển bước của luồng live trong UX_FLOW: bản hiện tại luôn ghi PREVIEW / DEMO, không cho rằng bước trước đã PASSED, không tạo quyết định hoặc bằng chứng xác thực. Điều kiện nghiệp vụ live vẫn cần Backend chốt và tích hợp ở bước sau.

Không thêm dependency, Router, API, Mock API, webcam, AI, dữ liệu cá nhân, session hoặc state machine nghiệp vụ. Không triển khai Admin Dashboard. Không xóa hay đổi tên placeholder.

## Page thực tế và cách ghép

| File có sẵn được hoàn thiện | Component export | Nội dung |
| --- | --- | --- |
| `src/pages/Welcome.tsx` | WelcomePage | Giới thiệu hệ thống, minh họa máy bay/vé bằng icon, tóm tắt 4 bước. Start Verification đặt tại footer chung của màn Welcome |
| `src/pages/ScanTicket.tsx` | TicketScanPage | Scan Boarding Pass; QR overlay/camera placeholder; Ready/Scanning/Processing/Error qua props; không đọc vé |
| `src/pages/ScanIdentity.tsx` | IdentityScanPage | Verify Identity; khung QR, các trường thông tin để trống, đối chiếu chưa thực hiện |
| `src/pages/FaceCapture.tsx` | FaceVerifyPage | Face & Liveness Verification; oval, hướng dẫn nhìn thẳng/chớp mắt/quay đầu, trạng thái chưa kiểm tra |
| `src/pages/Result.tsx` | ResultPage | Verification Result; Pending mặc định hoặc PASS/FAIL từ props; marker DEMO khi dữ liệu minh họa; Start Over |

App chọn page và truyền nội dung vào KioskLayout. Footer/header cùng callback đặt tại App để các page không tự quản lý điều hướng hoặc lặp lại layout. Tên file của bộ khung được giữ nguyên; không tạo thêm WelcomePage.tsx/TicketScanPage.tsx trùng chức năng.

Tái sử dụng: KioskLayout, KioskHeader, StepProgress, KioskButton, KioskCard, CameraFrame, QrScanFrame, OvalGuide, StatusIndicator, ErrorMessage và ResultCard. ResultCard sử dụng FailReasonBanner để hiển thị lý do khi có FAIL; không lắp một banner thứ hai trùng nội dung. Bước này không sửa implementation của component dùng chung.

## Điều hướng Preview

```text
Welcome → Ticket → Identity → Face → Result (Pending)
           ← Back ← Back ← Back ← Back
Start Over ở bất kỳ bước nào → Welcome
```

- App chỉ giữ `previewIndex` trong RAM, giới hạn 0–4. Không ghi URL, localStorage hoặc sessionStorage; tải lại trang quay về Welcome.
- Welcome không render StepProgress. Các màn còn lại truyền `currentStep` tương ứng ticket/identity/face/result; không truyền completedSteps hoặc errorSteps từ việc chuyển màn.
- Start Verification trong footer Welcome mở Ticket. Continue · Preview mở màn kế tiếp, không xác nhận QR/định danh/khuôn mặt đã hợp lệ.
- Back từ Ticket về Welcome; từ Identity/Face/Result về màn trước. Không có bằng chứng xác thực nào để giữ lại hoặc dùng lại.
- Result khóa Continue vì không có bước thứ năm. Header và action của ResultCard đều có Start Over.
- Start Over đặt vị trí về Welcome; page cũ và technical slot được unmount, trạng thái hiển thị cục bộ trong các slot cũng được dọn. Không gọi hủy/xóa phiên Backend vì chưa có session.
- Sau chuyển màn, focus tới h1 của page mới; không tự chuyển focus liên tục theo status. Mỗi h1 có tabindex=-1, skip link của layout được giữ nguyên.

## Props và ranh giới dữ liệu

TicketScanPage nhận `previewState?: 'ready' | 'scanning' | 'processing' | 'error'`, mặc định ready; `onRetry?: () => void` chỉ hiện ở Error khi bên gọi cấp callback. Nhãn Scanning/Processing/Error luôn ghi DEMO; không có timer hoặc kiểm tra QR thật. App hiện tại luôn dùng Ready. Đây là enum UI preview, không phải trạng thái Backend được chốt.

ResultPage nhận `result?: KioskResultView | null` và `onStartOver`. View model gồm:

```ts
interface KioskResultView {
  status: 'PASS' | 'FAIL';
  message: string;
  demo: boolean;
  reason?: { message: string; code?: string };
}
```

Đây là view model UI, không phải wire DTO. Kết quả null được trình bày bằng ResultCard PROCESSING với tiêu đề Pending; không suy ra FAIL do thiếu dữ liệu. App luôn truyền null trong Bước 2.3: chỉ đổi previewIndex không thể sinh PASS. Với kết quả minh họa, bên gọi phải truyền demo=true để hiện badge và nhãn DEMO. Kết quả live về sau phải do controller/adapter cung cấp, không tính trong page.

reason chỉ hiển thị khi FAIL; mã kỹ thuật không được bật trong ResultPage hành khách. Nội dung được React render như text, không dùng raw HTML. Không có tên/số định danh thật hoặc thông tin giả đã được xác minh trong Identity.

## Latency và điểm tích hợp

AppProps có `technicalPanel?: ReactNode`; slot chỉ render sau Welcome khi bên gọi cấp nội dung. Có thể lắp LatencyPanel vào đây sau khi có nguồn dữ liệu và kiểm tra quyền phù hợp. Bản mặc định không render số đo, công tắc debug hoặc panel rỗng cho hành khách. Slot không thay thế phân quyền Backend.

CameraFrame vẫn chỉ có placeholder/overlay; chưa có video stream. API client, hooks camera/session và mock handlers vẫn giữ nguyên. Hợp đồng QR/frame, 7 latency, mã lỗi, timeout/Retry/Back live, quyền thiết bị và quyết định cuối tiếp tục theo danh sách chưa chốt trong API_INTEGRATION_PLAN.

## File thay đổi

- Điền năm placeholder page liệt kê ở bảng trên.
- Sửa `src/App.tsx`: controller điều hướng preview, focus và technical slot.
- Bổ sung style page trong `src/styles/global.css`, dùng token cũ; không thay palette.
- Bổ sung một ghi chú lịch sử/cách mở App hiện tại vào `docs/UI_COMPONENTS.md`.
- Tạo tài liệu này. Các source/config/dependency/reference/tài liệu khác giữ nguyên; main.tsx và gate development không đổi.

## Kiểm chứng và cách chạy

Chạy tại `C:\QLDA_RBAI\frontend`:

```powershell
npm run dev
```

Mở `http://127.0.0.1:5173/` để đi luồng năm màn. `/ui-preview` tiếp tục chỉ là gallery component trong development. Production không chứa gallery hoặc fixture DEMO của gallery; bản App production ở giai đoạn này vẫn là luồng PREVIEW / DEMO theo yêu cầu, không phải hệ thống xác thực live.

Kiểm chứng: TypeScript, build, lint; render và điều hướng cả năm màn ở 1920×1080, 1366×768 và mobile 390 px; không tràn ngang/che footer, desktop vừa viewport, mobile cuộn dọc. Kiểm tra keyboard Enter và focus h1, Back/Start Over, không có camera/video/API request. Kiểm props Result Pending/PASS/FAIL DEMO và Ticket đủ bốn state qua render độc lập; xác nhận text được escape, mã kỹ thuật không lộ. Đây là kiểm thử UI, không phải TC nghiệm thu nghiệp vụ hoặc số liệu AI.

Bước tiếp theo cần thống nhất trạng thái UI/session, hợp đồng adapter/mock và chính sách điều hướng live trước khi gắn dữ liệu hoặc thiết bị. Chưa triển khai những phần đó trong Bước 2.3.
