-- ==========================================
-- FILE: benchmark_queries.sql
-- CHỨC NĂNG: Các câu truy vấn mẫu test luồng RBAI
-- ==========================================

-- 1. [MÔ PHỎNG LUỒNG 1] - Quét QR CCCD
-- Backend nhận id_number_hash từ Camera AI, cần lấy thông tin hành khách và ảnh khuôn mặt:
EXPLAIN ANALYZE
SELECT mock_identity_id, name, dob, sex, face_ref
FROM mock_identities
WHERE id_number_hash = '8b917748bb85853c09a0ec6db1939aab1972dd8f2a6af6c7c8dd7fff7ac370b3'; 
-- (Thay mã hash bằng mã thực tế của người số 4 hoặc số 6)

-- 2. [MÔ PHỎNG LUỒNG 2] - Quét QR Vé Máy Bay
-- Lấy thông tin vé, kết hợp (JOIN) với bảng chuyến bay để xem giờ bay có hợp lệ không:
EXPLAIN ANALYZE
SELECT 
    t.ticket_id, t.passenger_name, t.seat, t.booking_status,
    f.route, f.departure_time, f.gate
FROM tickets t
JOIN flights f ON t.flight_id = f.flight_id
WHERE t.ticket_id = 'TK000004';

-- 3. [MÔ PHỎNG LUỒNG 3] - Kiểm tra chéo (Verification)
-- Tìm xem hành khách này có vé hợp lệ cho chuyến bay hôm nay không:
EXPLAIN ANALYZE
SELECT t.ticket_id, t.booking_status, f.status AS flight_status
FROM tickets t
JOIN mock_identities m ON t.id_number = m.id_number
JOIN flights f ON t.flight_id = f.flight_id
WHERE m.mock_identity_id = 'MID000004' 
  AND t.booking_status = 'CONFIRMED';

-- 4. [THỐNG KÊ] - Đếm số lượng vé theo trạng thái (Check Performance)
EXPLAIN ANALYZE
SELECT booking_status, COUNT(*) 
FROM tickets 
GROUP BY booking_status;