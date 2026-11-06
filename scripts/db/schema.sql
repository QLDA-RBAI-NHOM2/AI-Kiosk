-- Tạo file này lưu trong thư mục dự án với tên: db/schema.sql
DROP TABLE IF EXISTS verification_sessions CASCADE;
DROP TABLE IF EXISTS tickets CASCADE;
DROP TABLE IF EXISTS mock_identities CASCADE;
DROP TABLE IF EXISTS flights CASCADE;

CREATE TABLE flights (
    flight_id VARCHAR(10) PRIMARY KEY,
    route VARCHAR(15) NOT NULL,
    departure_time TIMESTAMP NOT NULL,
    gate VARCHAR(10) NOT NULL,
    status VARCHAR(20) DEFAULT 'ON_TIME'
);

CREATE TABLE mock_identities (
    mock_identity_id VARCHAR(20) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    dob DATE NOT NULL,
    sex CHAR(1) CHECK (sex IN ('M', 'F')),
    id_number_hash CHAR(64) NOT NULL UNIQUE 
    --face_ref VARCHAR(255) NOT NULL
);

CREATE TABLE tickets (
    ticket_id VARCHAR(20) PRIMARY KEY,
    passenger_name VARCHAR(100) NOT NULL,
    id_number VARCHAR(12) NOT NULL,
    flight_id VARCHAR(10) NOT NULL REFERENCES flights(flight_id) ON DELETE CASCADE,
    seat VARCHAR(5) NOT NULL,
    booking_status VARCHAR(20) DEFAULT 'CONFIRMED'
);

CREATE TABLE verification_sessions (
    session_id BIGSERIAL PRIMARY KEY,
    ticket_id VARCHAR(20) REFERENCES tickets(ticket_id) ON DELETE SET NULL,
    id_number_masked VARCHAR(64) NOT NULL,
    result VARCHAR(20) NOT NULL,
    fail_reason VARCHAR(50),
    latency_ms NUMERIC(8, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_mock_id_hash ON mock_identities(id_number_hash);
CREATE INDEX idx_tickets_id_number ON tickets(id_number);