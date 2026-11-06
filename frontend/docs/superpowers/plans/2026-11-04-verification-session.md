# Verification Session Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement inline, task by task.

**Goal:** Thay điều hướng Preview bằng luồng xác thực MOCK có session, guards, Retry/Cancel và adapter thay thế được.

**Architecture:** Page nhận view props/action; một controller điều phối request và reducer thuần; VerificationApi độc lập implementation; MockVerificationApi deterministic trong mocks hiện có. Không thêm runtime dependency hoặc router.

**Tech Stack:** React 19, TypeScript 5.9, Vite 8; TypeScript compiler + Node test runner có sẵn.

**Spec:** File yêu cầu Bước 2.4 do người dùng đính kèm ngày 04/11/2026; đối chiếu UX_FLOW, FRONTEND_ARCHITECTURE, API_INTEGRATION_PLAN, KIOSK_SCREENS, UI_COMPONENTS, IMPLEMENTATION_ROADMAP.

## Global Constraints

- Chỉ Frontend; không webcam/QR thật/AI/FastAPI/DB/Docker/Admin.
- Chỉ adapter trả finalDecision; mọi mock result và latency ghi MOCK/DEMO.
- Không PII, ảnh/QR hoặc storage; không endpoint chưa chốt.
- Giữ nguyên file cũ, thư viện và design system; không commit các thay đổi cũ trong workspace.
- Người dùng yêu cầu trực tiếp triển khai trong workspace hiện tại; không dừng ở kế hoạch, không tạo worktree khác.

## Review Focus

- Start Over khi createSession chưa trả: response muộn không được áp dụng, session tạo muộn được hủy.
- Adapter bỏ qua AbortSignal: generation/request vẫn bảo vệ phiên mới.
- Duplicate click cùng tick và pending final result: chỉ một request hoạt động.
- Retry không giữ decision/latency/downstream cũ; mock cũng reset downstream khi nhận attempt mới.
- Kết quả thiếu/sai session/decision: không cho PASS, lỗi kỹ thuật không thành FAIL nghiệp vụ.

## Task 1: Interface, mock, error/latency mapping

Files: src/api/types.ts, adapter.ts, errorMapping.ts, latencyMapping.ts; src/mocks/handlers.ts; src/__tests__/verification.test.ts; tsconfig.test.json; package.json; .gitignore.

- [x] Viết và chạy test đỏ cho tạo phiên, 8 scenario, abort, invalid session, navigation prerequisites và latency.
- [x] Implement VerificationApi (createSession, verifyTicket, verifyIdentity, verifyFaceAndLiveness, getSessionResult, cancelSession); marker input không có dữ liệu thật.
- [x] Mock giữ phiên trong RAM, delay cấu hình, id deterministic, lỗi tập trung, final decision chỉ tại getSessionResult.
- [x] Chạy test và TypeScript, sửa lỗi trong phạm vi.

## Task 2: Reducer, controller, React hook

Files: src/state/verificationReducer.ts, VerificationController.ts; src/hooks/useSession.ts; cùng test suite.

- [x] Viết test đỏ guards, stale create/step/result, duplicate, cancellation và Retry downstream.
- [x] Reducer xử lý các event yêu cầu; controller khóa đồng bộ, AbortController, generation/attempt, session matching.
- [x] Back Ticket hủy về Welcome; Back giữa bước khóa do chưa có reset contract. Retry chỉ cùng bước được cấp, terminal không mở lại.
- [x] Hook subscribe qua useSyncExternalStore; cleanup hủy phiên khi unmount, tương thích StrictMode.
- [x] Chạy toàn suite; không suy PASS bằng phép AND ở UI.

## Task 3: Ghép UI

Files: App.tsx; 5 page; shared presentation VerificationStepControls.tsx nếu tránh lặp; styles/global.css; mocks/browser.ts và development controls.

- [x] Thêm browser assertions trước: Start loading, Continue khóa trước PASS, trạng thái Face/Liveness riêng, Result từ adapter, Retry/Cancel/reset.
- [x] Chọn adapter ở composition root; picker scenario và Technical Mode chỉ import trong DEV. Production mặc định ALL_PASS nhưng luôn nhãn MOCK/DEMO.
- [x] Page thuần props, giữ bố cục/camera placeholder. Technical latency chỉ từ adapter, không tính tổng.
- [x] Kiểm browser cả 8 scenario, keyboard, 1920×1080, 1366×768, 390px; production không chứa picker/gallery.

## Task 4: Kiểm chứng, review, bàn giao

- [x] TypeScript, lint, production build, test suite, console/network, Git diff check.
- [x] Reviewer độc lập đọc code/state/contract và tests; sửa lỗi quan trọng bằng regression tests.
- [x] docs/VERIFICATION_SESSION.md: kiến trúc, conventions khác bản đề xuất lịch sử, cách chạy, file và kiểm chứng; ghi giả định Backend và đề xuất 2.5.
- [x] Không triển khai Bước 2.5; không sửa source ngoài Frontend.

## Completion ledger

- Task 1 complete: interface/mock/error/latency; 13 tests đầu tiên RED (module chưa có) → GREEN.
- Task 2 complete: controller/reducer/hook; 29 tests GREEN, gồm generation/abort/duplicate/retry/cancel.
- Task 3 complete: browser assertions RED trước ghép UI → GREEN; 8 scenario development và ALL_PASS production, keyboard, Technical Mode, privacy/storage/network; không dependency mới.
- Final review: reviewer độc lập chỉ đọc source; phát hiện snapshot downstream, provenance và Retry final-result; các regression tests tái hiện lỗi trước khi sửa. Sửa thêm cleanup và nhãn latency/terminal reason trong phạm vi yêu cầu.
- Final verification: npm run typecheck, npm test (44/44), npm run lint, npm run build và git diff --check đều đạt. Browser xác nhận production không chứa picker/Technical controls/gallery, 5 màn tại 1920×1080, 1366×768, 390×844 không tràn ngang/đè footer. Sau chỉnh khoảng cách cuối Result, cả 5 màn production vừa viewport ở hai kích thước desktop.
- Decisions: giữ workspace được chỉ định và các thay đổi cũ, không commit/worktree; Back giữa bước khóa do chưa có reset contract; retry đọc kết quả idempotent chỉ là contract MOCK; không tự bật chính sách này với dịch vụ live chưa thống nhất.
- Không còn finding chưa xử lý. Camera/QR/AI/FastAPI/DB/Docker/Admin/TTL/HTTP reconciliation thật nằm ngoài phạm vi; giữ làm phụ thuộc cần xác nhận, không chứng nhận hoàn thành.
