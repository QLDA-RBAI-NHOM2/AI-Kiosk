# Camera Manager Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans inline; preserve the current workspace and uncommitted work.

**Goal:** Webcam realtime dùng chung và capture cục bộ, không thay đổi xác thực MOCK.

**Architecture:** CameraProvider là interface độc lập React, BrowserCameraProvider là owner duy nhất của MediaStream. useCamera gắn vòng đời với session; CameraVideo chỉ gắn/tháo srcObject. useFrameCapture dùng utility canvas có giới hạn kích thước, không giữ Blob trong UI. Page chỉ nhận slot camera và controls.

**Tech Stack:** React/TypeScript/MediaDevices/canvas, compiler và Node test runner hiện có; không dependency mới.

**Spec:** Yêu cầu Bước 2.5 đính kèm ngày 04/11/2026; docs/FRONTEND_ARCHITECTURE.md, API_INTEGRATION_PLAN.md, UX_FLOW.md, UI_COMPONENTS.md, KIOSK_SCREENS.md, VERIFICATION_SESSION.md.

## Global Constraints

- Không commit/push, không FastAPI/QR/OCR/Face/Liveness/DB/Docker/Admin.
- Không audio, upload, storage, log frame hoặc tự capture theo timer.
- Welcome không mở camera. Nút Bật camera tại bước xác thực là hành động xin quyền rõ ràng. MOCK Verify vẫn chạy khi camera tắt/lỗi, luôn có nhãn chính sách DEMO.
- Reuse stream khi đổi mode; stop trước đổi thiết bị; cleanup Result/Cancel/Start Over/unmount/pagehide.
- Capture theo hành động, tối đa 1280×720, JPEG mặc định; Blob chỉ trong RAM và bị bỏ qua khi phiên/mode thay đổi.
- Tài liệu cũ chưa chốt camera owner toàn hệ thống; user hiện yêu cầu Browser preview. Không khẳng định Backend đã đồng ý sở hữu/transport.

## Review Focus

- Permission promise không thể abort: response muộn phải stop toàn bộ tracks, không gắn lại vào phiên mới.
- Start lặp/đổi thiết bị trong permission request: serialize acquire, chỉ một stream owner.
- Unmount CameraVideo khi đổi page chỉ detach, không stop stream dùng chung.
- Track ended/device change/capture callback đến muộn không cập nhật state cũ hoặc giữ frame.
- Camera ready không làm PASSED; cả 44 tests cũ và 8 scenario vẫn qua khi permission denied.

## Task 1 — Provider và capture core

Files: src/camera/types.ts, errors.ts, BrowserCameraProvider.ts; src/utils/captureFrame.ts; src/__tests__/camera.test.ts; package.json test script.

- [x] Test RED cho secure/support/permission/unavailable/start/stop/modes/devices/disconnect/race/capture/cancel.
- [x] Implement provider với injectable browser environment, generation và shared pending start, track cleanup.
- [x] Implement bounded JPEG/WebP canvas capture + AbortSignal, validate video ready/ownership.
- [x] Run suite, giữ 44 tests xác thực cũ.

## Task 2 — Hook, camera UI và session lifecycle

Files: existing useCamera.ts/useFrameCapture.ts; new CameraVideo.tsx/CameraControls.tsx; CameraFrame.tsx type slot; App.tsx và 3 page camera, Welcome copy, styles.

- [x] Browser assertions RED: không xin quyền Welcome; bật camera hiện video; vẫn khóa Continue trước Mock Verify.
- [x] Hook sở hữu provider, bind mode theo phiên; reset/unmount/pagehide dừng và invalidate capture.
- [x] Video autoplay/muted/playsInline, object-fit contain, overlay QR/oval không đổi màu theo camera.
- [x] Controls start/stop/select/capture và trạng thái an toàn; UI chỉ metadata capture, không ảnh/Blob/storage.
- [x] Kiểm đủ luồng, Cancel/Result/Start Over/unmount/denied, responsive và network bằng fake media.

## Task 3 — Review và bàn giao

- [x] Reviewer độc lập chỉ đọc; regression tests cho lỗi quan trọng; không re-review không cần thiết.
- [x] TypeScript/lint/build/all tests, browser smoke và Git diff/hash baseline.
- [x] docs/CAMERA_INTEGRATION.md đầy đủ kiến trúc, chính sách DEMO, hướng dẫn webcam thật, contract chưa chốt và mức sẵn sàng GitHub.
- [x] Cập nhật ghi chú tài liệu liên quan; không tự chuyển FastAPI hoặc commit/push.

## Completion ledger

- Task 1 complete: camera core tests RED do implementation chưa tồn tại → GREEN; capture cancellation sau encoder và enumeration không chặn acquire RED→GREEN; 44 tests cũ giữ nguyên.
- Task 2 complete: browser assertion Bật camera RED trước UI → GREEN; một stream qua 3 mode, capture JPEG cục bộ, scope cleanup và video readiness.
- Final review độc lập chỉ đọc source: sửa 3 Important (post-acquire cleanup, provider qua keyed App remount, playback readiness); thêm regression cho refresh devices/overlay art/video viewport. Unit và browser regression RED→GREEN; không còn finding treo.
- Final checks: typecheck/lint/build đạt; 61/61 tests. Browser DEV/production fake media ở 3 kích thước, cả 8 MOCK scenarios khi deny, keyboard, capture, cleanup/stale permission đạt; không console error/upload/external request.
- Kiểm thiết bị không cờ fake: Chicony USB2.0 Camera READY 1280×720, audioTracks=0, JPEG capture metadata hợp lệ; không lưu ảnh. Chưa thử nhiều camera/tháo cắm vật lý.
- Git/hash: 9 file mới, 13 sửa, 62 baseline không đổi, không xóa file; không commit/push. Session/reducer/VerificationApi/mock/44 test cũ/lockfile giữ nguyên.
- Decisions: explicit Bật camera trong phiên; MOCK vẫn chạy không camera với nhãn rõ. Browser owner chỉ trong phạm vi preview hiện tại, không coi là contract Backend. Màn thấp cho cuộn khi thêm metadata/debug/lỗi để giữ touch target và footer trong flow.
