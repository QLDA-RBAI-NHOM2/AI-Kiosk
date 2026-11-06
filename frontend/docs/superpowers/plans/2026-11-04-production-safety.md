# Production Safety and Handover Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans inline. Preserve current checkout and uncommitted work; no commit/push.

**Goal:** Development giữ đầy đủ MOCK/camera; production chưa có Backend luôn SERVICE_UNAVAILABLE, không tải luồng cấp PASS giả; hoàn thiện QA và bàn giao.

**Architecture:** Compile-time flag từ Vite command (serve, không preview) chỉ lazy-import development application/gallery. Production chọn UnavailableVerificationApi và màn ServiceUnavailable thuần trình bày; không App/session/camera/mock runtime. API hiện có giữ nguyên interface, thêm mã lỗi dịch vụ. Không endpoint/config bật live giả.

**Tech Stack:** React 19/TS5.9/Vite8, existing Node tests + bundled browser for QA. No added dependency.

**Spec:** User attachment 951783e3-7cb7-4155-bdcd-002aed377e5c/Pasted text.txt (Bước 2.6 Production Safety, QA, GitHub Readiness); docs architecture/API/session/camera/components/screens.

## Global Constraints

- Chỉ frontend; không Backend/AI/DB/Docker/Admin/tính năng 2.7 hoặc polish mới.
- Giữ 61 tests và 8 scenarios, camera/capture/guards; không xóa placeholder.
- Không production MOCK ALL_PASS hoặc URL/storage/env client override để bật mock.
- Chưa Backend: “Hệ thống xác thực chưa được kết nối. Vui lòng liên hệ nhân viên hỗ trợ.”
- Frontend fail-closed không phải server authorization/tamper-proof; không kết quả client nào có giá trị cấp quyền.
- Không commit/push/init/remote changes; references và tài liệu nội bộ cần người dùng xét quyền chia sẻ.

## Review Focus

- Build với mode/NODE_ENV khác vẫn không bundle development application hoặc gallery.
- Production URL/result route, storage/session overrides, keyboard/button/native submit không mở session/PASS/camera.
- 6 operation của unavailable adapter đều từ chối; controller không tạo phiên/khóa request vĩnh viễn.
- DEV lazy boundary không làm mất camera provider singleton qua scenario remount.
- README/Git inventory phải tách file sẵn sàng review với Excel/ảnh/tài liệu chứa nội dung nội bộ chưa xác nhận quyền công khai.

## Task 1 — Fail-closed runtime and tests

- [x] RED: tests UnavailableVerificationApi operations/controller; browser production hiện vẫn hoàn thành ALL_PASS.
- [x] Move existing development composition to DEV-only module, preserve behavior; Vite command flag for entry/gallery.
- [x] Implement unavailable adapter/message + production page, no endpoints or mock import in build.
- [x] Run old/new suite and inspect real production preview/bundle; add reproducible check-production script.

## Task 2 — Evidence-based review / Git hygiene / handover

- [x] Review code/privacy/lifecycle/latency/errors; only fix demonstrated bugs with regressions.
- [x] .gitignore env/credentials/caches/logs, check representative paths and tracked inventory; scan filenames/secret patterns without leaking values.
- [x] README + FRONTEND_HANDOVER + note historical production behavior changed; list Backend dependencies and reference sharing decisions.

## Task 3 — Final QA and independent review

- [x] Reviewer read-only scoped changes; handle Important findings with regression tests.
- [x] typecheck/lint/build/all tests/check-production + DEV browser 8 scenarios/camera/errors/cleanup and PROD preview fail-closed.
- [x] Responsive 1920×1080/1366×768/390px, keyboard, no camera/network/storage in production.
- [x] Git diff/hash baseline, inventory commit candidates and report Git root/branch; no commit/push/2.7.

## Completion ledger

- Task 1 complete: production browser RED (bản cũ chưa unavailable) và missing adapter unit RED → GREEN; 64 tests gồm 61 cũ + 3 production. Runtime DEV được chuyển vị trí, không tạo camera/controller thứ hai; build thường và NODE_ENV=development/--mode development loại mock app/gallery/camera, artifact check đạt.
- Task 2 complete: env/credential/cache/log ignore và path samples; không credential khớp pattern được tìm thấy, không tuyên bố scan toàn diện. README/handover, reference publication caveats và Backend checklist hoàn tất. Không source ngoài Frontend.
- Review read-only: không Critical/Important; xử lý Minor về entry HTML bằng 4 CLI fixture tests (3 negative cases RED→GREEN), thêm common credential names và check-ignore. Không còn finding treo.
- Task 3 complete: 68/68 test, typecheck/lint/build/artifact checks đạt. Browser DEV đủ 8 scenario, fake camera, permission/errors/capture/cleanup/keyboard/responsive/gallery; PROD preview unavailable trước routes/storage/globals/DOM disabled overrides, không gọi camera, ghi storage hoặc API. Không console/page error hoặc request ra ngoài.
- Baseline SHA: 9 file mới, 14 sửa, 70 giữ nguyên, 0 xóa; CameraProvider/controller/reducer/61 tests/lockfile/references giữ nguyên. Git root C:/QLDA_RBAI, nhánh main, không commit/push/init/đổi remote.
- Decisions/boundaries: Backend chưa có thì production không mount workflow, không chỉ ẩn controls. Compile flag không phải server authorization; DOM/JS có thể bị người kiểm soát browser sửa, nên server phải cấp quyền/thẩm định quyết định sau này. Không thử lại phần cứng camera trong 2.6; fake media regression đã chạy, lượt webcam vật lý ở 2.5 ghi riêng. References và docs nội bộ cần người dùng xét quyền trước khi chia sẻ GitHub công khai.
