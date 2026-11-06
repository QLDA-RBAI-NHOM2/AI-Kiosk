# Camera Integration — Bước 2.5

> **Bước 2.6:** webcam/MOCK hiện chỉ có trong development. Production chưa có Backend luôn SERVICE_UNAVAILABLE, không mount camera. Những lượt production camera/ALL_PASS trong tài liệu này ghi nhận lịch sử 2.5; xem [FRONTEND_HANDOVER](FRONTEND_HANDOVER.md) cho chính sách hiện tại.

Ngày 04/11/2026. Webcam preview và capture cục bộ cho Airport AI Verification Kiosk. Xác thực vẫn do MockVerificationApi, không QR decoding/OCR/Face Recognition/Liveness AI/FastAPI/DB/Docker/Admin. Không commit hoặc push trong bước này.

## Khảo sát, nguồn và phạm vi quyết định

Đã đọc các tài liệu liên quan: FRONTEND_ARCHITECTURE, API_INTEGRATION_PLAN, UX_FLOW, UI_COMPONENTS, KIOSK_SCREENS, VERIFICATION_SESSION; đối chiếu roadmap/design system và nguồn tham khảo đã khảo sát. Hai hook useCamera/useFrameCapture ban đầu còn rỗng; CameraView là alias CameraFrame; CameraFrame đã có children/overlay slot nên không tạo khung camera thứ hai. Git đang có toàn bộ thay đổi 2.1–2.4 chưa commit; giữ nguyên, không xóa file.

FRONTEND_ARCHITECTURE/API_INTEGRATION_PLAN trước đây để mở ai sở hữu camera. Yêu cầu Bước 2.5 hiện chỉ định browser getUserMedia: triển khai BrowserCameraProvider cho Frontend theo yêu cầu này, **chưa khẳng định camera owner/transport toàn hệ thống đã được Backend xác nhận**. Camera thật không tạo bằng chứng xác thực; mọi PASS/FAIL/latency vẫn là MOCK/DEMO.

Hai lựa chọn là các page tự mở stream hoặc owner dùng chung. Owner dùng chung đáp ứng một acquire queue và cleanup phiên; page chỉ nhận props/slot. Không thêm React Context vì chỉ App cần truy cập provider; không thư viện camera, store hoặc dependency mới.

## Kiến trúc và interface

```text
KioskApplication → một BrowserCameraProvider tồn tại qua lần đổi scenario
  → App / useCamera: bind session + mode, không gọi getUserMedia từ page
    → CameraVideo: srcObject, autoplay/muted/playsInline, readiness/playback error
    → CameraFrame + QrScanFrame/OvalGuide: bố cục, overlay
    → CameraControls: Bật/Dừng/Chọn camera/Capture
    → useFrameCapture → provider.captureFrame → canvas utility → metadata UI
VerificationController/Reducer/Api/Mock Adapter: giữ nguyên, không nhận frame
```

`src/camera/types.ts` định nghĩa CameraProvider:

```ts
interface CameraProvider {
  startCamera(mode: CameraMode, deviceId?: string): Promise<boolean>;
  stopCamera(): void;
  switchMode(mode: CameraMode): void;
  captureFrame(video: HTMLVideoElement, signal?: AbortSignal): Promise<CapturedFrame>;
  getCameraStatus(): CameraState;
  subscribe(listener: () => void): () => void;
}
```

CameraState tách hoàn toàn khỏi VerificationSession: mode, status, stream, devices, selectedDeviceId, issue. Không có finalDecision hoặc module status trong provider. Thay nguồn camera sau này bằng implementation khác cùng interface, cấp tại composition root; không sửa từng page.

CameraEnvironment là seam tới secure context/MediaDevices/canvas, phục vụ browser implementation và unit test không cần webcam. CameraProvider ở đây là interface/service, không phải một React Provider khác trùng chức năng.

## Mở, dừng và mode

1. Welcome không xin quyền, không video/stream. Start Verification chỉ tạo session MOCK.
2. Tại Ticket bấm **Bật camera**. Kiểm secure context và hỗ trợ MediaDevices trước; hiện “Đang yêu cầu quyền camera”. Trình duyệt xin quyền video, luôn audio=false.
3. Stream ưu tiên ideal 1280×720; không bắt buộc Full HD, không hardcode deviceId/facingMode. Video tự phát, muted, playsInline; object-fit contain, không kéo giãn/crop theo khung.
4. TICKET_QR → IDENTITY_QR → FACE chỉ đổi mode, giữ nguyên stream nếu còn phù hợp. QR overlay ở hai bước đầu; OvalGuide ở Face, không bbox AI/đổi màu PASS theo camera.
5. Khi có hơn một videoinput, selector **Chọn camera** hiển thị nhãn do trình duyệt cấp. Đổi thiết bị dừng tracks cũ trước acquire mới. Không dùng microphone hoặc lưu deviceId vào storage.
6. Dừng camera thủ công giải phóng tracks; có thể bật lại. Không tự khởi động lại sau lỗi hoặc quay lại tab.

| Mode | Nơi dùng | Hoạt động |
| --- | --- | --- |
| IDLE | Welcome/Result/phiên bị hủy | Dừng, không capture |
| TICKET_QR | Ticket | Preview + QR guide; chưa giải mã QR |
| IDENTITY_QR | Identity | Dùng chung stream + QR guide; không có PII giả được xác minh |
| FACE | Face | Dùng chung stream + oval, trạng thái Face/Liveness vẫn lấy mock |

Status riêng: IDLE, REQUESTING_PERMISSION, READY, PERMISSION_DENIED, UNAVAILABLE, UNSUPPORTED, DISCONNECTED, ERROR. READY chỉ nghĩa có stream; Capture chỉ enable sau video thực sự `playing`, đủ dữ liệu và đúng bước đang hoạt động, không request xác thực đang xử lý. Camera ready không đồng nghĩa Ticket/Identity/Face/Liveness PASSED.

## Vòng đời và race condition

- Một provider ở KioskApplication nằm trên App được key theo scenario, nên acquire queue vẫn tồn tại khi App remount. Hai lần bấm Start camera cùng scope dùng cùng promise; những acquire khác được serialize.
- getUserMedia không có AbortSignal chuẩn để hủy permission prompt. Stop/reset vô hiệu generation ngay; stream cấp muộn bị stop toàn bộ tracks, không gắn lại. Không mở acquire thứ hai khi acquire cũ còn chờ.
- Mode/device/stream/phiên thay đổi hủy capture; callback Blob hoặc enumeration cũ không ghi đè state mới. Refresh device list có sequence riêng để chống phản hồi hotplug đảo thứ tự.
- Provider nhận ownership ngay sau acquire, trước khởi tạo listener/đọc metadata; lỗi khởi tạo cũng stop stream và tháo listener. getSettings là metadata tùy chọn, thiếu/lỗi không làm rò stream hoặc vô hiệu preview còn dùng được.
- Chuyển page chỉ detach/pause video element cũ, không stop stream dùng chung. Provider mới là nơi dừng tracks.
- Result, Start Over, Cancel, Back từ Ticket, session bị adapter hủy, đổi scenario, App unmount và pagehide đều dừng camera. Không lưu/resume stream sau refresh.
- Lỗi thiết bị phát track ended → DISCONNECTED, dừng các tracks còn lại; user kết nối lại rồi bấm Bật camera. devicechange cập nhật danh sách thiết bị.

## Capture frame

Bấm **Capture frame** trong phiên đang hoạt động khi video đã phát. Đây là thao tác kiểm tra capture cục bộ, không gửi dữ liệu vào Mock Verify.

1. Kiểm provider READY, mode khác IDLE, video.srcObject đúng stream đang sở hữu, track live, readyState ≥ 2 và kích thước video hợp lệ.
2. Canvas tạo theo tỷ lệ gốc, không upscale, tối đa 1280×720; JPEG quality 0.82 mặc định. Utility hỗ trợ yêu cầu WebP; MIME thực tế lấy từ Blob nếu trình duyệt fallback.
3. Trả `{blob, width, height}` cho lớp tích hợp nội bộ. Hook hiện chỉ lấy metadata (kích thước, MIME, bytes), không giữ Blob/ảnh trong state.
4. Canvas được xóa kích thước sau encode hoặc hủy. AbortSignal, stop/mode change/reset và generation loại bỏ frame đến muộn, kể cả encode xong nhưng consumer chưa resume.
5. UI thông báo frame đã được bỏ; không tạo object URL/base64, download, ảnh preview, storage hoặc upload. Browser có thể quản lý bộ nhớ encode/Blob đến khi GC; không tuyên bố secure erase bộ nhớ trình duyệt.

Không có loop capture/FPS/backpressure/streaming tự động. VerificationApi vẫn nhận mock-marker; chưa sửa payload ảnh khi chưa có contract Backend.

## Chính sách MOCK và quyền riêng tư

Camera là tùy chọn trong luồng MOCK hiện tại. Mọi bước hiển thị rõ có thể tiếp tục mô phỏng khi camera tắt, không tồn tại hoặc bị từ chối. Mock Verify vẫn phải qua guards 2.4; bấm Bật camera hoặc Capture không mở Continue, không sửa finalDecision.

Không lưu video/frame/device ID vào localStorage, sessionStorage, IndexedDB, console hoặc analytics. Không có fetch/WebSocket/upload từ provider/capture. Không gửi webcam qua Internet. Bật camera là hành động riêng trong phiên; Welcome/Result không dùng camera.

## Lỗi thường gặp

| Tình huống | Xử lý |
| --- | --- |
| Không phải secure context | Không gọi getUserMedia; hướng dẫn HTTPS/localhost. Không tự cấu hình server/SSL |
| MediaDevices không hỗ trợ | UNSUPPORTED; tiếp tục MOCK hoặc dùng trình duyệt phù hợp |
| NotAllowed/SecurityError | PERMISSION_DENIED; hướng dẫn cấp quyền trong trình duyệt rồi bật lại |
| Không thiết bị/NotFound | UNAVAILABLE; kiểm kết nối hoặc tiếp tục DEMO |
| NotReadable/TrackStart | Có thể bận bởi ứng dụng khác; không kết luận kết quả xác thực |
| Overconstrained | Thử camera/cấu hình khác; không ép constraints Full HD |
| Track ended | DISCONNECTED, stop, cho bật lại |
| Autoplay/playback lỗi | Thông báo trên preview; Capture vẫn khóa, không coi loadeddata là video đã phát |
| Video chưa sẵn sàng/capture lỗi | Không tạo frame; thông báo capture an toàn |

Mapper chỉ dùng mã/name đã biết, không render raw browser exception/stack hoặc payload.

## Kiểm thử và webcam vật lý

Chạy:

```powershell
cd C:\QLDA_RBAI\frontend
npm run dev
npm run typecheck
npm run lint
npm test
npm run build
```

Mở http://127.0.0.1:5173/ → Start Verification → Bật camera → cấp quyền. Kiểm video và QR guide; Capture frame chỉ hiện metadata. Bấm Mock Verify/Continue để đi Identity/Face; stream tiếp tục, không xin quyền mới. Result/Cancel/Start Over phải làm đèn camera tắt và track ended. Thử từ chối quyền, tháo camera, ứng dụng khác chiếm camera, chọn thiết bị khác, bắt đầu/dừng nhanh và unmount/refresh.

Trong development vẫn có 8 scenario ở Development · MOCK controls, Technical Mode, camera/capture và gallery /ui-preview. Từ Bước 2.6 production không có mock workflow/camera/controls/gallery; hiển thị dịch vụ chưa kết nối. Lượt kiểm camera production trước đây thuộc mốc 2.5, không phải hướng dẫn triển khai hiện tại.

QA tự động dùng Node test runner hiện có và Chrome fake media device/UI cấp quyền giả; capture qua video/canvas thật của browser nhưng nguồn của các bài regression là giả. Kiểm tra explicit start, không audio, reuse stream, cleanup, capture ready/not-ready, permission denied/unavailable/unsupported, delayed permission, đổi scenario, autoplay rejected, video không phủ status và mock guards.

Ngoài fake media, đã kiểm tra thêm Chrome **không có cờ fake media** trên thiết bị trình duyệt báo **Chicony USB2.0 Camera (04f2:b729)**: video READY 1280×720, audioTracks=0, Capture tạo JPEG 1280×720 (92.876 bytes trong lượt đo). Chỉ metadata được đọc, không chụp screenshot webcam hoặc lưu/upload ảnh; Start Over và đóng browser test sau khi kiểm. Chưa thử tháo/cắm hoặc đổi nhiều camera vật lý, các nhánh này kiểm bằng nguồn giả/unit tests. Permission denied/unavailable/unsupported và lỗi autoplay được giả lập có kiểm soát, không coi là đã thử mọi cài đặt OS.

| Kiểm tra cuối | Kết quả |
| --- | --- |
| TypeScript / lint / production build | Đạt |
| npm test | 61/61: 44 kiểm thử xác thực cũ + 17 kiểm thử camera/capture, không bỏ qua test |
| Browser fake media development/production | Preview/canvas capture, mode reuse, track cleanup Result/Cancel/Start Over/Back/unmount/pagehide, late permission, capture keyboard Enter/Space đạt |
| MOCK khi từ chối camera | Cả 8 scenario và Retry/Timeout/Network Error giữ nguyên; camera không mở Continue/PASS |
| Review regressions | Cleanup khi post-acquire init lỗi, provider sống qua đổi scenario, autoplay readiness, enumeration cũ, art che thông báo và video vượt viewport đã sửa và kiểm RED→GREEN |
| Responsive | 1920×1080, 1366×768, 390×844 không tràn ngang/che footer; video contain, QR/oval ở trên video. 1366 có cuộn dọc nhẹ tại Ticket sau capture/Identity hoặc khi mở controls/thông báo; mobile cuộn dọc |
| Console/network/storage | Không console/page error, upload hoặc request ra ngoài trong smoke; không dữ liệu local/session storage |
| Production gate | Không chứa picker/Technical controls/gallery development; CameraControls vẫn có |
| Git/hash | diff --check đạt; 9 file mới, 13 file sửa; 62 file baseline giữ nguyên, 0 file bị xóa |

## File và mức sẵn sàng GitHub

Tạo: src/camera/types.ts, errors.ts, BrowserCameraProvider.ts; src/utils/captureFrame.ts; src/components/CameraVideo.tsx, CameraControls.tsx; src/__tests__/camera.test.ts; docs/CAMERA_INTEGRATION.md và kế hoạch Bước 2.5.

Sửa: hai hook camera/capture còn rỗng; App.tsx, KioskApplication.tsx; CameraFrame.tsx (thêm kiểu slot), Welcome/ScanTicket/ScanIdentity/FaceCapture, global.css và package.json (thêm camera test). Tài liệu lịch sử chỉ thêm ghi chú dẫn tới tài liệu này. VerificationController/reducer, VerificationApi/types/mock, 44 test cũ, dependency/lockfile/reference giữ nguyên.

Có thể review và chuẩn bị commit phần Frontend: các checks đã đạt và đã thử preview/capture bằng webcam không dùng cờ fake. Không tự commit/push. Repo đang chứa cả thay đổi từ các bước trước, cần review toàn diff trước thao tác GitHub. Chưa chứng nhận nghiệm thu toàn bộ phần cứng, thiết bị khác hoặc tích hợp live chỉ từ các lượt QA này.

## Backend cần xác nhận

1. Camera owner toàn hệ thống: browser mở stream hay Backend sở hữu thiết bị; tránh cả hai cùng mở webcam.
2. QR gửi frame hay decoded payload; không triển khai decode tại FE nếu chưa được giao.
3. Face/Liveness: MIME, kích thước, tần suất/batch, challenge, cancellation/backpressure, hạn phiên và quyền Retry.
4. Transport local/LAN, auth, cleanup/retention, error code, idempotency và session binding; chưa tạo endpoint hoặc upload.
5. Tỷ lệ/video fit, mirror/crop/tọa độ oval và quyền thiết bị trên màn Kiosk thật. Preview hiện giữ nguyên tỷ lệ, không mirror ảnh capture.

Các điểm này là phụ thuộc bước tích hợp kế tiếp; không tự triển khai FastAPI hoặc AI trong Bước 2.5.
