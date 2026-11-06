# Verification Session — Bước 2.4

> **Thay đổi production ở Bước 2.6:** production hiện SERVICE_UNAVAILABLE và không tải MOCK/session/camera. Các kết quả production ALL_PASS bên dưới là lịch sử mốc 2.4. Xem [FRONTEND_HANDOVER](FRONTEND_HANDOVER.md) và [README](../README.md).

> Từ Bước 2.5 đã có [camera preview và capture cục bộ](CAMERA_INTEGRATION.md). Logic session/guards/Mock Adapter dưới đây giữ nguyên; nhận định “chưa có camera” là mốc lịch sử 2.4.

Ngày 04/11/2026. Phạm vi: Frontend MOCK, không camera/QR/AI/FastAPI/DB/Docker/Admin. Đọc cùng [kế hoạch](superpowers/plans/2026-11-04-verification-session.md).

## Khảo sát và quyết định

Đã đối chiếu UX_FLOW, FRONTEND_ARCHITECTURE, API_INTEGRATION_PLAN, KIOSK_SCREENS, UI_COMPONENTS, IMPLEMENTATION_ROADMAP và ảnh `references/kiosk-reference.jpg`. Trước bước này App dùng previewIndex; năm page đã có bố cục; API/types/client, mocks/handlers/browser và useSession là placeholder. Không có service/store cần thay thế hoặc thư viện router/test để tái sử dụng. Git có thay đổi của Bước 2.1–2.3 chưa commit; giữ nguyên, không reset/xóa file.

Các tài liệu Giai đoạn 1 và KIOSK_SCREENS là bản ghi lịch sử. Bước 2.4 thay điều hướng Preview không điều kiện bằng guard MOCK; không coi thay đổi này là thay đổi yêu cầu nghiệp vụ Excel. Interface trong API_INTEGRATION_PLAN là đề xuất: tên submitTicket/submitIdentity/submitFaceEvidence được triển khai thành verifyTicket/verifyIdentity/verifyFaceAndLiveness theo yêu cầu 2.4. Không có tên nào là endpoint chính thức.

Lựa chọn: reducer thuần + controller có thể kiểm thử không cần React, hook useSyncExternalStore, giữ session trong RAM. Không thêm Context vì chỉ App sở hữu phiên; không thêm store/router/MSW/testing dependency. Page gọi callback được cấp, không import adapter hoặc quyết định xác thực. Camera/API client/idle-reset vẫn chưa triển khai.

## Bốn tầng

```text
KioskApplication (composition root chọn adapter)
  → App / useSession
    → VerificationController + verificationReducer
      → VerificationApi interface
        → MockVerificationApi (thay bằng FastAPI adapter ở bước sau)
  → 5 page + reusable presentation components
```

`src/api/types.ts` định nghĩa VerificationSession: sessionId, source, currentStep, sessionStatus, ticketStatus, identityStatus, faceStatus, livenessStatus, finalDecision, errorCode, latency, createdAt, allowedNext và retry. errorMessage không lặp trong snapshot: error mapper tạo `VerificationIssue.message` an toàn trong state controller.

StepStatus gồm IDLE, SCANNING, PROCESSING, PASSED, FAILED, ERROR, TIMEOUT, CANCELLED. SessionStatus riêng ACTIVE/COMPLETED/CANCELLED; request create/step/result riêng. PASSED của module không phải PASS toàn phiên. Chỉ getSessionResult của adapter trả finalDecision. UI không cộng latency, không so khớp vé/định danh hoặc tính threshold.

## Interface nội bộ

```ts
interface VerificationApi {
  createSession(signal?: AbortSignal): Promise<VerificationResponse>;
  verifyTicket(sessionId: string, input: VerificationInput, signal?: AbortSignal): Promise<StepResult>;
  verifyIdentity(sessionId: string, input: VerificationInput, signal?: AbortSignal): Promise<StepResult>;
  verifyFaceAndLiveness(sessionId: string, input: VerificationInput, signal?: AbortSignal): Promise<StepResult>;
  getSessionResult(sessionId: string, signal?: AbortSignal): Promise<FinalResult>;
  cancelSession(sessionId: string, signal?: AbortSignal): Promise<void>;
}
```

Input hiện chỉ `{kind: 'mock-marker'}`. Không chứa QR thô/frame/ảnh/PII. Adapter thật cần contract input capture được nhóm chốt trước; không gửi marker cho FastAPI. `api/adapter.ts` là điểm export interface ổn định; `api/client.ts` để nguyên placeholder vì chưa có HTTP contract. Validation ở controller kiểm tra normalized snapshot, không thay validation DTO trong adapter thật.

## Transition, guard và request

- START_SESSION → request tạo phiên; SESSION_CREATED → Ticket IDLE. Double click bị khóa đồng bộ trước await.
- BEGIN_STEP → SCANNING; PROCESS_STEP → PROCESSING. Mock Verify gửi marker; các snapshot trả qua STEP_PASSED/STEP_FAILED, hoặc STEP_ERROR/STEP_TIMEOUT.
- Continue chỉ khi không request/lỗi, phiên ACTIVE, bước hiện tại PASSED và allowedNext đúng. Identity yêu cầu Ticket PASSED; Face yêu cầu thêm Identity PASSED.
- Face/Liveness riêng; cả hai PASSED chỉ cho phép yêu cầu kết quả, không sinh final PASS. Có quyết định hợp lệ mới SET_FINAL_RESULT và mở Result.
- Thất bại nghiệp vụ giữ nguyên bước; được Retry theo grant hoặc yêu cầu kết quả FAIL qua getSessionResult. Không nhảy qua bước thất bại. Result terminal không Retry lại phiên đã đóng.
- RETRY_STEP xóa status bước hiện tại/downstream, decision, error, grants và latency trước request mới. Mock cũng reset downstream ở phía adapter. Lỗi mạng/timeout cho retry tại bước theo chính sách mock nội bộ; live cần xác nhận reconciliation/idempotency.
- Lỗi kỹ thuật khi lấy kết quả được ghi riêng `failedOperation=result`: Retry chỉ gọi lại getSessionResult, không quét lại QR/Face hoặc xóa bằng chứng đã chấp nhận. Mock cho phép đọc lại quyết định terminal một cách idempotent; contract live cần xác nhận trước khi bật retry này với adapter thật.
- Back từ Ticket hủy và về Welcome; Back Identity/Face/Result khóa vì chưa có operation reset/reopen Backend. Start Over có ở header/Result; Cancel có cả lúc tạo và xác thực.
- CANCEL_SESSION reset về Welcome kèm thông báo đã hủy; START_OVER reset sạch. Generation bị vô hiệu trước AbortSignal/cancel API. Local reset không chờ cancel ack và không tuyên bố cleanup Backend thành công.
- Mỗi request có generation/id/kind, response phải đúng session. Response/error cũ bị bỏ qua ngay cả khi adapter bỏ qua AbortSignal. Phiên tạo muộn sau reset được gửi hủy để tránh orphan.
- source/createdAt của phiên bất biến; step snapshot không được điền trước bước sau hoặc thay kết quả đã chấp nhận của bước trước. Snapshot tạo phiên bị bác cũng được gửi cleanup best-effort nếu có session ID.
- Unmount/đổi scenario hủy controller/phiên cũ; hook tương thích StrictMode. Refresh luôn Welcome; không localStorage/sessionStorage, không PII trong URL/log.

## Scenario và cách chạy

```powershell
cd C:\QLDA_RBAI\frontend
npm run dev
```

Mở `http://127.0.0.1:5173/`. Mở **Development · MOCK controls**, chọn **Mock scenario**; đổi scenario hủy phiên và quay Welcome. Checkbox **Technical Mode · DEMO** chỉ có trong development. `/ui-preview` vẫn là gallery development riêng.

| Scenario | Hành vi |
| --- | --- |
| ALL_PASS | Ba bước PASSED; gọi getSessionResult mới có PASS MOCK |
| INVALID_TICKET | Ticket FAILED; Retry tại Ticket hoặc xem Result FAIL MOCK |
| IDENTITY_MISMATCH | Identity FAILED; không mở Face |
| FACE_MISMATCH | Face FAILED, Liveness PASSED; kết quả cuối chỉ từ adapter |
| LIVENESS_FAILED | Face PASSED, Liveness FAILED; không Continue |
| REQUEST_TIMEOUT | Ticket TIMEOUT; lỗi kỹ thuật, finalDecision vẫn null |
| NETWORK_ERROR | Ticket ERROR; lỗi kỹ thuật, không FAIL nghiệp vụ |
| SESSION_CANCELLED | Adapter hủy phiên tại Ticket; yêu cầu bắt đầu lại |

Retry giữ scenario nên lỗi deterministic sẽ lặp lại. Muốn demo luồng thành công sau lỗi: đổi ALL_PASS, bắt đầu phiên mới; không sửa kết quả cũ thành PASS. Mock delay mặc định 600 ms, constructor cho cấu hình 0–5000 ms, không random. Timeout/network scenario là phản hồi lỗi mô phỏng sau delay, chưa phải timeout HTTP/TTL/idle policy thật.

Ở mốc 2.4 production từng chạy MOCK ALL_PASS có nhãn. Từ 2.6 hành vi này đã được loại bỏ: chỉ development được tải mock workflow; production dùng unavailable adapter và không cho bắt đầu xác thực khi chưa có Backend. Không có công tắc bật live/debug qua URL/storage. Đổi adapter về sau tại composition root theo contract thật, giữ page độc lập.

## Latency và lỗi

LatencyPanel chỉ render khi Technical Mode được cấp. Adapter trả fixture có nhãn DEMO: qr_ticket_ms=0, total_ms=null ở bước; total_ms=840 khi có kết quả. 840 không được tính từ delay hoặc cộng module. Không thêm bốn tên chưa được xác nhận; db_lookup_ms không giả định thuộc bộ 7. mapLatency giữ nguyên giá trị: 0 hiển thị 0 ms; null “Chưa có số đo”; undefined “Chưa được cung cấp”; âm/NaN/Infinity “Không hợp lệ”. Đây là thay đổi cần thiết duy nhất trong shared component cũ để đáp ứng phân biệt null/undefined của Bước 2.4.

errorMapping tập trung mã nội bộ → thông báo tiếng Việt, phân loại business/technical/cancelled. Không render raw Error/stack/payload. Mã lạ/snapshot sai contract chặn tiếp tục và báo lỗi vận hành; không suy FAIL. Cancel/stale/duplicate có xử lý riêng; duplicate không đè trạng thái request đang chạy.

## File trong phạm vi

Tạo: api/adapter.ts, errorMapping.ts, latencyMapping.ts, validation.ts; state/verificationReducer.ts, VerificationController.ts; components/VerificationStepControls.tsx; mocks/DevelopmentControls.tsx; KioskApplication.tsx; __tests__/verification.test.ts; tsconfig.test.json; tài liệu này và kế hoạch.

Điền placeholder: api/types.ts, mocks/handlers.ts, mocks/browser.ts, hooks/useSession.ts.

Sửa: App.tsx, main.tsx, năm page, styles/global.css và nhãn dữ liệu thiếu của LatencyPanel; package.json thêm test script; .gitignore/eslint.config.js bỏ qua output test; thêm ghi chú lịch sử vào KIOSK_SCREENS/UI_COMPONENTS. Không thêm dependency, không sửa lockfile.

## Kiểm chứng

`npm test`: TypeScript compiler có sẵn biên dịch test/core vào `.test-build` (ignore), rồi Node built-in test runner; không cài framework. Unit/integration bao phủ scenario, guards, cancellation, timeout, session isolation, duplicate, retry downstream, safe error/schema và latency. Browser smoke kiểm thực tế từ Welcome, loading, Verify/Continue/Retry/Result/Cancel/Start Over và reset khi đổi scenario; responsive/keyboard và production gate.

| Kiểm tra | Kết quả |
| --- | --- |
| npm run typecheck | Đạt |
| npm test | 44/44 unit/integration tests đạt, không test bị bỏ qua |
| npm run lint | Đạt, generated test output được bỏ qua |
| npm run build | Đạt; không thêm dependency hoặc sửa lockfile |
| Browser development | Đủ 8 scenario; PASS/FAIL/Retry/Timeout/Cancel, Start Over trong create/step, đổi scenario, keyboard Enter/Space và focus h1 |
| Browser production | Đủ 5 màn và luồng ALL_PASS; /ui-preview trở về Welcome; không picker hoặc Technical checkbox |
| Responsive | 1920×1080, 1366×768, 390×844: không tràn ngang, footer không đè nội dung; 5 màn production ALL_PASS vừa viewport ở hai kích thước desktop, mobile cuộn dọc. Development màn thấp có thể cuộn thêm do vùng điều khiển; lỗi hoặc mở Technical Panel cũng có thể tăng chiều cao |
| Console/network/privacy | Không console/page error, request ra ngoài, video/webcam hoặc dữ liệu storage trong lượt smoke |
| Git | diff --check đạt, không xóa file cũ, thay đổi trước đó được giữ |

Review độc lập đã phát hiện và được sửa bằng regression tests: snapshot điền trước bước sau, provenance đổi mock→backend, Retry sai operation sau mất final response, cleanup/cancel edge cases, null/undefined và hướng dẫn trên Result FAIL. 44/44 test đạt sau lượt sửa; không còn finding chưa xử lý. Đây không phải TC01–TC08 hoặc chứng nhận Backend/AI.

## Cần Backend xác nhận và đề xuất Bước 2.5

1. OpenAPI/DTO/transport/auth, mapping 8 bước nội bộ ↔ 4 bước UI, final-result protocol/polling nếu có.
2. TTL/idle timeout, Retry grants, reset/reopen, cancellation ack, idempotency/reconciliation khi request timeout/mất mạng. Chính sách hiện tại chỉ thuộc MOCK.
3. Input QR/frame và camera owner; Face/Liveness challenge/chưa đủ dữ liệu; không thể đổi sang live chỉ bằng URL.
4. Error catalog/localization, masked passenger summary và quyền Technical Mode; không dựa vào checkbox development để phân quyền live.
5. Đủ 7 latency, định nghĩa total_ms và db_lookup_ms, null/missing/invalid và đơn vị wire.

Bước 2.5 đề xuất: thống nhất capture/camera contract, bổ sung camera owner/hook capture dùng chung và kiểm permission/cleanup bằng nguồn giả trước thiết bị thật. Hoặc adapter FastAPI + contract tests nếu OpenAPI đã sẵn sàng; cần người dùng chọn phạm vi tiếp theo. Chưa triển khai các phần này.
