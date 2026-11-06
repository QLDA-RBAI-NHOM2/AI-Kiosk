-- ==========================================
-- FILE: indexes.sql
-- CHỨC NĂNG: Tối ưu hóa truy vấn cho 100k bản ghi
-- ==========================================

-- 1. Index cho bảng mock_identities
-- Mục đích: Tăng tốc độ tìm kiếm khi quét QR CCCD hoặc tìm theo mã băm HMAC-SHA256
CREATE INDEX IF NOT EXISTS idx_mock_id_hash ON mock_identities(id_number_hash);
CREATE INDEX IF NOT EXISTS idx_mock_id_number ON mock_identities(id_number);

-- 2. Index cho bảng tickets
-- Mục đích: Tăng tốc tìm kiếm vé máy bay khi quét QR vé hoặc tra cứu theo CCCD
CREATE INDEX IF NOT EXISTS idx_ticket_id ON tickets(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_passenger_id ON tickets(id_number);
CREATE INDEX IF NOT EXISTS idx_ticket_flight ON tickets(flight_id);

-- 3. Index cho bảng flights
-- Mục đích: Tăng tốc khi lọc chuyến bay theo ngày giờ hoặc trạng thái
CREATE INDEX IF NOT EXISTS idx_flight_departure ON flights(departure_time);
CREATE INDEX IF NOT EXISTS idx_flight_status ON flights(status);

-- 4. Index cho bảng verification_sessions
-- Mục đích: Tăng tốc truy xuất lịch sử check-in của một người hoặc xem theo kết quả
CREATE INDEX IF NOT EXISTS idx_session_ticket ON verification_sessions(ticket_id);
CREATE INDEX IF NOT EXISTS idx_session_result ON verification_sessions(verification_result);
CREATE INDEX IF NOT EXISTS idx_session_time ON verification_sessions(created_at);