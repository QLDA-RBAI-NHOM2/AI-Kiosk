# Frontend Handover — Bước 2.6

Ngày 04/11/2026. Phạm vi NV03/Frontend. Trạng thái: **Mock Integration Ready**, chưa xác thực hành khách thật. Hướng dẫn cài đặt/chuyển máy: [README](../README.md).

## Vấn đề có bằng chứng và thay đổi

1. Production trước đây mặc định tạo Mock ALL_PASS dù ẩn controls. Đã tách toàn bộ development application qua lazy import chỉ được Vite serve; production chọn UnavailableVerificationApi và ServiceUnavailablePage, không mount App/session/result/camera. Production tests từ trạng thái thiếu implementation/màn unavailable đã tái hiện lỗi trước khi sửa.
2. Gate cũ chỉ dựa import.meta.env.DEV. Đã dùng define `__KIOSK_DEVELOPMENT__` từ Vite command=serve và không preview; kiểm thêm build với NODE_ENV=development/--mode development vẫn không có MOCK runtime. Không có query/storage/VITE_* override để mở mock.
3. .gitignore chưa có env/private key/credential/cache/log patterns. Đã bổ sung và kiểm bằng git check-ignore; không tạo credential mẫu thật hoặc thay index.
4. Thiếu README trong frontend. Đã bổ sung README và tài liệu này, chỉ thêm ghi chú lịch sử cho tài liệu cũ. Không refactor controller/camera chỉ vì sở thích, không điền/xóa placeholder ngoài phạm vi.

## Production safety và giới hạn bảo mật

Production hiện luôn SERVICE_UNAVAILABLE: “Hệ thống xác thực chưa được kết nối. Vui lòng liên hệ nhân viên hỗ trợ.” Start xác thực disabled, không stepper/Result PASS, không camera hoặc scenario/Technical controls/gallery. Sáu method của unavailable adapter đều reject SERVICE_UNAVAILABLE; không tạo session, final decision hoặc HTTP request. Đây là adapter từ chối có chủ đích, không phải FastAPI adapter giả.

Development vẫn giữ đầy đủ 5 màn, 8 scenario, guards, Retry/Timeout/Cancel/Start Over, Technical DEMO và camera/capture. DEV CameraProvider singleton giữ nguyên qua keyed App khi đổi scenario. Camera ready/capture không phải PASSED; không có thuật toán QR/Face/Liveness.

UI không có thẩm quyền cấp quyền an ninh. Người kiểm soát trình duyệt có thể thay JavaScript/DOM; Frontend không thể ngăn việc tạo một ảnh/nội dung PASS giả bằng công cụ ngoài luồng ứng dụng. Khi có Backend, quyết định và việc cấp quyền phải kiểm chứng phía server. Loại bỏ luồng MOCK khỏi build và ignore client overrides không thay Authentication/Authorization.

## Rà soát code, camera và privacy

Đã kiểm App/pages/components/controller/reducer/mock/camera/capture/error/latency. Page không gọi MockVerificationApi/HTTP trực tiếp; controller dùng VerificationApi; mapping tách riêng; latency động giữ 0/null/undefined/invalid, không cộng total hoặc đặt đủ 7 tên. Không QR decoder/threshold/Rule Engine tại UI. Không thấy any không cần thiết hoặc endpoint hardcode trong source liên quan.

Camera chỉ có một BrowserCameraProvider; audio=false, không upload/storage/log frame, Capture chỉ metadata và canvas cleanup. Giữ các regression tests cho init failure, late permission/capture/response, duplicate, scenario remount, enumeration ordering và autoplay failure. Cancel/Back/Result/Start Over/unmount/pagehide dừng tracks. Không thêm streaming/upload hoặc animation/polish.

Secret review giới hạn source/config/file inventory và các pattern private key/cloud/GitHub/OpenAI token/npm auth token: không tìm thấy credential khớp pattern trong phần Frontend được review. Không phải chứng nhận không có mọi loại secret, dependency CVE audit, pentest, hoặc bảo mật toàn hệ thống.

## Backend phải xác nhận

| Nhóm | Chưa được xác nhận |
| --- | --- |
| OpenAPI/Swagger | Version/schema, URL/method, request/response, validation runtime, transport local/LAN |
| Session | Create/read/final-result/cancel, TTL/idle/resume, mapping 8 bước nội bộ ↔ 4 bước UI |
| QR | Format Ticket/Identity, frame hay decoded QR, error codes và masked summary |
| Ảnh/AI | MIME/kích thước/batch/FPS/challenge, trạng thái thiếu dữ liệu, hủy/backpressure |
| Camera | Browser hoặc Backend owner, preview transport, mirror/crop/tọa độ overlay |
| Retry | Retry grants, reset/reopen, idempotency/reconciliation sau mất response, final read idempotency |
| Lỗi | Business/technical/error catalog/localization, unknown/malformed response |
| Latency | Đủ 7 tên, phạm vi đo/đơn vị/null, total_ms, db_lookup_ms có thuộc bộ 7 hay không |
| Authentication | Auth/session binding, quyền technical/debug, authorization phía server nếu có |
| Privacy | Masking/retention/cleanup/ack và dữ liệu tối thiểu cho UI |

Input VerificationApi hiện chỉ mock-marker. Không gửi ảnh hoặc dựng endpoint dựa vào tên method. Mọi dữ liệu trên vẫn là phụ thuộc cần nhóm chốt; không gán mặc định thành contract chính thức.

## Checklist tiếp tục phát triển

- [ ] Nhận OpenAPI và mẫu DTO giả đã duyệt; xác nhận lifecycle, owner camera và auth.
- [ ] Implement adapter thật + DTO validation/error/latency mapping, giữ page không gọi URL.
- [ ] Contract tests cho PASS/FAIL/missing decision/unknown error/retry/cancel/stale/idempotency.
- [ ] Chỉ thay lựa chọn production adapter khi dịch vụ thật được tích hợp/kiểm chứng; không bật lại Mock ALL_PASS cho production.
- [ ] Kiểm E2E local/LAN trên kiosk đích, webcam/permissions/multi-device/cleanup và quyền truy cập.
- [ ] Nhận TC01–TC08 chính thức; không tự gán các unit tests thành TC nghiệm thu hoặc KPI AI.

Checklist là công việc kế tiếp cần được giao, chưa triển khai Bước 2.7/FastAPI/AI/DB/Docker/Admin trong đợt này.

## QA cuối Bước 2.6

| Kiểm tra | Kết quả |
| --- | --- |
| TypeScript / ESLint / production build | Đạt |
| npm test | 68/68: giữ nguyên 61 tests cũ, thêm 3 adapter/controller safety và 4 kiểm tra artifact qua CLI/fixture; không bỏ qua test |
| npm run check:production | Đạt: kiểm index.html/module entry tồn tại và entry có SERVICE_UNAVAILABLE; quét JS assets cả thư mục con để loại MOCK workflow/gallery/debug/camera acquisition |
| Build sai mode/env | Đã thử NODE_ENV=development + --mode development: vẫn fail-closed, không MOCK workflow; sau đó khôi phục build production tiêu chuẩn |
| Production preview browser | SERVICE_UNAVAILABLE tại /, /ui-preview, /result và query/hash development/scenario/debug; seeded storage/global state PASS và sửa disabled bằng DOM không mở session/PASS/camera |
| Production responsive/keyboard | 1920×1080, 1366×768, 390×844 không tràn ngang/dọc hoặc đè footer; skip link/Enter đúng; thao tác xác thực mặc định disabled và không có handler |
| Development browser | Đủ 8 scenario khi deny camera; PASS/FAIL/Retry/Timeout/Network/Cancel, camera/capture bằng fake media, dùng lại stream, cleanup và late permission đạt; gallery/Technical DEMO giữ lại |
| Regression browser | Autoplay bị từ chối giữ Capture disabled; scenario remount giữ acquire queue; video trong viewport, art không che thông báo |
| Development responsive | 3 kích thước như trên, video contain, không tràn ngang/đè footer; có cuộn dọc khi nội dung/capture/debug dài, mobile cuộn dọc |
| Console/network/storage | Không console/page error, upload hoặc request ra ngoài trong smoke; production không gọi camera hoặc ghi storage (ngoài dữ liệu giả do test tự seed có chủ đích) |
| Git/ignore/hash | diff --check đạt; env/credential/cache/log mẫu bị ignore, env.example được phép; 9 file mới, 14 sửa, 70 baseline giữ nguyên, 0 file xóa |

Browser QA dùng Chrome và fake media deterministic. **Không thử lại webcam vật lý trong Bước 2.6**; lượt Chicony camera thật ở 2.5 được giữ trong CAMERA_INTEGRATION, không nhầm với QA safety lần này. Không kiểm every OS/browser/multi-device/USB hotplug vật lý. Browser smoke là lượt kiểm trong môi trường làm việc với Playwright có sẵn, không cài thêm dependency browser vào project; nơi khác có thể thực hiện checklist thủ công trong README.

Review độc lập không có Critical/Important. Hai góp ý Minor (check artifact chưa neo entry HTML, tên credential phổ biến chưa đủ) đã được xử lý trong phạm vi QA/Git hygiene: fixture regression RED→GREEN và git check-ignore mẫu. Một số text lỗi MOCK trong error catalogue dùng chung vẫn có thể nằm trong JS; chúng không phải mock workflow/adapter/control hoặc đường cấp PASS. Không tuyên bố bundle tuyệt đối không có chữ MOCK.

Không coi check artifact hoặc browser smoke là pentest/server authorization: kiểm tra tĩnh không thay runtime/contract tests, và Backend chưa tồn tại để kiểm tích hợp thật.

## File Bước 2.6

File mới (9):

- README.md; docs/FRONTEND_HANDOVER.md; docs/superpowers/plans/2026-11-04-production-safety.md.
- src/api/UnavailableVerificationApi.ts; src/pages/ServiceUnavailable.tsx; src/mocks/DevelopmentApplication.tsx.
- src/__tests__/production.test.ts; scripts/check-production.mjs; scripts/check-production.test.mjs.

File sửa (14):

- .gitignore; package.json; vite.config.ts.
- src/KioskApplication.tsx; src/main.tsx; src/vite-env.d.ts; src/api/types.ts; src/api/errorMapping.ts.
- docs/FRONTEND_ARCHITECTURE.md; docs/API_INTEGRATION_PLAN.md; docs/VERIFICATION_SESSION.md; docs/CAMERA_INTEGRATION.md; docs/UI_COMPONENTS.md; docs/KIOSK_SCREENS.md (ghi chú/production policy lịch sử).

Không đổi dependency/lockfile, CameraProvider/capture implementation, VerificationController/reducer, 61 tests cũ hoặc references. Không xóa placeholder. Chỉ sửa source trong frontend.

## GitHub / chuyển máy

Git root tại máy bàn giao: `C:\QLDA_RBAI`; nhánh `main`. Chưa stage/commit/push/init/đổi remote. Working tree bao gồm cả các bước trước.

Ứng viên commit sau review:

- `src/` (source, test, mock/dev controls và placeholder hiện hữu).
- `public/`, `scripts/`, README.md, .gitignore.
- package.json/package-lock.json, index.html, TypeScript/Vite/ESLint configs; giữ config placeholder cũ nếu vẫn thuộc repo.
- Tài liệu kỹ thuật không chứa nội dung nội bộ chưa được phép; review danh mục bên dưới trước khi công khai.

Không commit node_modules/dist/.test-build/cache/log/secret/env/ảnh CCCD/frame sinh trắc học thật. .env.example được whitelist nhưng vẫn phải không chứa secret. .gitignore không tự bỏ file đã được Git track hoặc nội dung nhạy cảm ở tên khác.

Cần quyết định quyền chia sẻ trước commit công khai: Excel phân bổ nguồn lực (tên người/phân công/chi phí), ảnh tham khảo có thương hiệu bên thứ ba, và docs khảo sát/thiết kế dẫn thông tin nội bộ. Danh sách cụ thể tại [README](../README.md#github-và-tài-liệu-tham-khảo). File được giữ nguyên, không tự xóa hoặc công khai.

Chuyển máy: copy/zip Frontend có source/config/lockfile/docs; bỏ dependency/build/output/secret/log. Dùng Node 24/npm 11, `npm ci` → `npm run dev` để test MOCK/camera; `npm run build` → `npm run check:production` → `npm run preview` phải thấy SERVICE_UNAVAILABLE. Không cần Backend để phát triển độc lập, nhưng chưa thể triển khai xác thực hành khách thật.
