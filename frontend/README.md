# Airport AI Verification Kiosk — Frontend

Frontend NV03 cho quy trình xác thực hành khách: Welcome → Ticket → Identity → Face & Liveness → Result. Trạng thái bàn giao: **Mock Integration Ready**, có webcam preview/capture cục bộ; **chưa có xác thực hành khách thật hoặc FastAPI/AI**.

Phạm vi NV03: UI/UX, component, hiển thị camera/QR guide/oval, session và navigation, adapter interface, lỗi/kết quả/latency và kiểm thử Frontend. Backend, giải mã QR, Face/Liveness AI, database, Docker/DevOps và Admin Dashboard chưa thuộc implementation này.

## Development khác production

| Lệnh | Hành vi |
| --- | --- |
| `npm run dev` | Đủ 5 màn, 8 scenario MOCK, Technical Mode DEMO, webcam/capture; PASS/FAIL chỉ là kết quả kịch bản |
| `npm run build` rồi `npm run preview` | **SERVICE_UNAVAILABLE** vì chưa có Backend. Không MOCK adapter, không luồng xác thực/PASS, không camera hoặc development controls |

Thông báo production: **“Hệ thống xác thực chưa được kết nối. Vui lòng liên hệ nhân viên hỗ trợ.”** Đây là hành vi dự kiến, không phải lỗi cài đặt. Không đổi mode/URL/storage để bật MOCK trong bản build.

Gate development được Vite cấu hình từ command `serve` và không phải preview; mọi `vite build`, kể cả `--mode development`, đều tắt gate. Tách bundle là phòng vệ Frontend, **không thay server authorization**. Người có thể sửa JavaScript/DOM của máy mình có thể sửa nội dung hiển thị; nội dung client không được dùng để cấp quyền đi qua cửa hoặc chứng minh PASS. Backend sau này phải quyết định và xác minh quyền ở phía server.

## Yêu cầu môi trường

- Đã kiểm với Node.js 24.15 và npm 11.12; khuyến nghị Node 24/npm 11 khi chuyển máy.
- `package.json` cho phép Node `^20.19.0 || ^22.13.0 || >=24.0.0`; chưa kiểm mọi tổ hợp phiên bản.
- Chrome được dùng trong browser QA; trình duyệt/thiết bị khác cần kiểm trên môi trường đích.
- Camera cần HTTPS hoặc localhost, quyền thiết bị của trình duyệt/OS. Webcam không bắt buộc để chạy MOCK.

## Cài đặt và chạy trên máy khác

Giải nén và mở terminal tại thư mục `frontend`:

```powershell
npm ci
npm run dev
```

Mở `http://127.0.0.1:5173/`. Không cần Python, Backend hoặc database để chạy development MOCK. Server hiện chỉ bind localhost; không coi truy cập LAN qua HTTP là secure context cho camera.

Khi zip/chuyển máy, giữ source/config/lockfile/README/docs/public. Chủ động bỏ `node_modules`, `dist`, `.test-build`, cache/log, `.env`/credential và dữ liệu webcam nếu có. `.gitignore` không tự lọc nội dung file ZIP. `references` và tài liệu nội bộ chỉ gửi/chia sẻ trong phạm vi được phép; xem phần GitHub bên dưới.

## Kiểm tra chất lượng

```powershell
npm run typecheck
npm run lint
npm test
npm run build
npm run check:production
npm run preview
```

Preview tại `http://127.0.0.1:4173/` theo mặc định Vite. `check:production` kiểm artifact đã build, yêu cầu chạy build trước: SERVICE_UNAVAILABLE phải có; MOCK workflow, gallery/debug và camera acquisition không được nằm trong JS production. Lệnh này không thay browser smoke test hoặc xác thực bảo mật Backend.

Tests dùng TypeScript compiler + Node built-in test runner, không framework/dependency kiểm thử mới. Output `.test-build` được ignore. Giữ 61 tests của Bước 2.5 và bổ sung production tests; kết quả QA mới nhất ở [bàn giao](docs/FRONTEND_HANDOVER.md).

## Sử dụng development MOCK

1. Bấm Start Verification để tạo phiên giả.
2. Mở **Development · MOCK controls** để chọn scenario. Đổi scenario hủy/reset phiên.
3. Các scenario: ALL_PASS, INVALID_TICKET, IDENTITY_MISMATCH, FACE_MISMATCH, LIVENESS_FAILED, REQUEST_TIMEOUT, NETWORK_ERROR, SESSION_CANCELLED.
4. Bấm Mock Verify ở từng bước; Continue chỉ mở theo kết quả adapter. Retry lặp cùng scenario deterministic; muốn luồng thành công sau lỗi, đổi ALL_PASS và tạo phiên mới.
5. Technical Mode chỉ có trong development; latency luôn DEMO. `total_ms` không được Frontend cộng từ các module.
6. `/ui-preview` là gallery development. Cùng URL trên production chỉ hiển thị dịch vụ chưa kết nối.

Camera/capture thành công không mở Continue hoặc tạo PASS. Back chỉ hủy từ Ticket; Back giữa bước khóa khi chưa có contract reset/reopen. Start Over/Cancel reset phiên và bỏ request/frame cũ.

## Kiểm tra webcam

Trong một phiên development, bấm **Bật camera** → cho phép quyền. Kiểm video và QR guide; sang Identity/Face dùng cùng stream và oval. **Capture frame** tạo một JPEG tối đa 1280×720, chỉ hiển thị metadata, không lưu/upload. Khi trình duyệt cấp hơn một camera, có selector chọn thiết bị.

Thử Dừng camera, Cancel, Back từ Ticket, Start Over và Result: tracks phải kết thúc. Thử từ chối quyền hoặc không có camera: thông báo rõ và vẫn chạy MOCK có nhãn DEMO. Permission camera không phải kết quả xác thực.

Đã có QA fake media và thử preview/capture trên Chicony USB2.0 Camera ở mốc 2.5. Chưa chứng nhận mọi OS, thao tác tháo/cắm hoặc nhiều webcam vật lý. Chi tiết vòng đời, capture và lỗi: [CAMERA_INTEGRATION](docs/CAMERA_INTEGRATION.md).

## Cấu trúc

```text
frontend/
├── src/
│   ├── KioskApplication.tsx    # chọn runtime DEV hoặc production unavailable
│   ├── App.tsx                # ghép UI/controller của luồng development hiện tại
│   ├── api/                   # interface, validation, error/latency, unavailable adapter
│   ├── camera/                # CameraProvider và BrowserCameraProvider
│   ├── components/            # reusable UI, camera video/controls
│   ├── hooks/                 # session, camera, capture
│   ├── mocks/                 # development application + 8 scenario
│   ├── pages/                 # 5 màn, service unavailable; admin placeholder
│   ├── state/                 # controller/reducer
│   ├── utils/                 # bounded canvas capture
│   └── __tests__/             # unit/integration
├── docs/                      # khảo sát, thiết kế và bàn giao
├── public/                    # asset cục bộ
├── references/                # nguồn tham khảo, cần xét quyền chia sẻ
└── scripts/check-production.mjs
```

Các placeholder ErrorBoundary, idle reset, API client, admin/manual input và cấu hình Docker/nginx chưa triển khai được giữ nguyên; không coi tên file là tính năng đã hoàn thành.

## Tiếp tục tích hợp Backend

Đọc [FRONTEND_HANDOVER](docs/FRONTEND_HANDOVER.md), [API_INTEGRATION_PLAN](docs/API_INTEGRATION_PLAN.md), [VERIFICATION_SESSION](docs/VERIFICATION_SESSION.md), [FRONTEND_ARCHITECTURE](docs/FRONTEND_ARCHITECTURE.md), [UI_COMPONENTS](docs/UI_COMPONENTS.md), [KIOSK_SCREENS](docs/KIOSK_SCREENS.md). Các tài liệu 2.1–2.5 là bản ghi lịch sử; production policy Bước 2.6 trong README/bàn giao này được ưu tiên khi khác mô tả cũ.

Chỉ thay production unavailable sau khi có OpenAPI/DTO/transport/auth và contract tests. Không tạo “FastAPI adapter” trả thành công giả. Page không gọi endpoint; adapter thật validate DTO rồi map sang interface nội bộ. Cần chốt lifecycle, QR/ảnh, camera owner, Retry/reset/idempotency, error catalog và 7 latency. Không đưa secret vào `VITE_*`: giá trị client được đóng gói công khai.

## GitHub và tài liệu tham khảo

Repository tại thời điểm bàn giao: Git root `C:\QLDA_RBAI`, nhánh `main`; workspace là thư mục con `frontend`. Không `git init` lại, đổi remote hoặc commit/push tự động. Thư mục giải nén trên máy khác có thể chưa thuộc Git repository.

Source, test, public, scripts, package/lockfile, cấu hình, README và tài liệu kỹ thuật là ứng viên review/commit. Các thay đổi từ 2.1–2.6 còn chung trong working tree, phải review toàn diff trước commit.

Cần người dùng xác nhận trước khi chia sẻ công khai:

- `references/Bang_Phan_bo_nguon_luc.xlsx`: tài liệu nhóm, có phân công/tên thành viên và thông tin nguồn lực/chi phí.
- `references/kiosk-reference.jpg`: ảnh tham khảo có thương hiệu bên thứ ba; chưa có bằng chứng quyền tái phân phối.
- Tài liệu khảo sát/thiết kế dẫn Excel, tên người, kế hoạch và thông tin nội bộ (đặc biệt WORKSPACE_AUDIT, IMPLEMENTATION_ROADMAP, FRONTEND_ARCHITECTURE, API_INTEGRATION_PLAN, UX_FLOW, UI_DESIGN_SYSTEM): review phạm vi được phép công khai. Không tự xóa/redact nguồn đã được cung cấp.

Trong nhánh bàn giao công khai, hai file tham khảo và sáu tài liệu khảo sát/thiết kế nêu trên chưa được đưa vào commit khi chưa xác nhận quyền chia sẻ. Chúng vẫn được giữ trong workspace nội bộ; các liên kết tới tài liệu này cần gói bàn giao nội bộ tương ứng. Source, test và hướng dẫn chạy MOCK không phụ thuộc các file đó.

`.gitignore` chặn dependency/build/test output/cache/log/env/private key/credential thường gặp, nhưng không bảo vệ file đã track, ảnh sinh trắc học đặt tên tùy ý hoặc secret bên trong file được phép commit. Luôn review nội dung trước khi chia sẻ; không có ảnh webcam/QR/CCCD thật được lưu bởi ứng dụng hiện tại.
