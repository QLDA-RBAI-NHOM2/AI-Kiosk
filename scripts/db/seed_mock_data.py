import time
import random
import hashlib
import hmac
import pandas as pd
import psycopg2
from psycopg2.extras import execute_values

DB_CONFIG = {"host": "localhost", "database": "airport_sim", "user": "postgres", "password": "Thanh6624", "port": 5432}
EXCEL_PATH = "../../data/seed/dataset_50_tickets.xlsx"

# --- CẤU HÌNH BẢO MẬT ĐÃ ĐỒNG BỘ VỚI BACKEND ---
SECRET_PEPPER = "qlda_rbai_dummy_pepper_2026"

def normalize_id(id_string: str) -> str:
    """Chuẩn hóa ID: Xóa khoảng trắng 2 đầu và đảm bảo định dạng."""
    return str(id_string).strip()

def hash_id_number(id_num: str, pepper: str = SECRET_PEPPER) -> str:
    """Băm số CCCD bằng thuật toán HMAC-SHA256 với Pepper."""
    normalized_id = normalize_id(id_num)
    h = hmac.new(
        key=pepper.encode('utf-8'), 
        msg=normalized_id.encode('utf-8'), 
        digestmod=hashlib.sha256
    )
    return h.hexdigest()

# --- TỪ ĐIỂN SINH TÊN TIẾNG VIỆT ---
LAST_NAMES = ["NGUYEN", "TRAN", "LE", "PHAM", "HOANG", "VU", "VO", "DANG", "BUI", "DO", "LY", "NGO", "DUONG"]
MIDDLE_M = ["VAN", "CONG", "HOANG", "MINH", "DUC", "QUOC", "THANH", "XUAN", "DINH", "HUU", "NGOC", "BAO"]
FIRST_M = ["THANH", "ANH", "SON", "TUAN", "DUNG", "GIANG", "HAI", "KHOA", "LONG", "KIEN", "DAT", "HUY", "PHUC", "NAM", "NHAT", "VU"]
MIDDLE_F = ["THI", "NGOC", "BAO", "PHUONG", "THU", "KHANH", "MY", "THANH", "HONG", "MAI", "KIM", "THUY"]
FIRST_F = ["LINH", "HUONG", "TRANG", "ANH", "THAO", "HA", "VY", "NHUNG", "YEN", "QUYNH", "LAN", "MAI", "HIEN", "NGAN"]

def generate_vn_name(sex):
    if sex == "M":
        return f"{random.choice(LAST_NAMES)} {random.choice(MIDDLE_M)} {random.choice(FIRST_M)}"
    else:
        return f"{random.choice(LAST_NAMES)} {random.choice(MIDDLE_F)} {random.choice(FIRST_F)}"

def scale_database(target_records=100000):
    conn = psycopg2.connect(**DB_CONFIG)
    cur = conn.cursor()
    
    print(f"1. Nạp dữ liệu từ file Excel {EXCEL_PATH}...")
    df_flights = pd.read_excel(EXCEL_PATH, sheet_name="flights", dtype=str)
    df_ids = pd.read_excel(EXCEL_PATH, sheet_name="mock_identities", dtype=str)
    df_tickets = pd.read_excel(EXCEL_PATH, sheet_name="tickets", dtype=str)

    # Dọn dẹp dấu nháy đơn do Excel tạo ra
    df_ids["id_number"] = df_ids["id_number"].str.lstrip("'")
    df_tickets["id_number"] = df_tickets["id_number"].str.lstrip("'")

    # Tự động băm cột id_number_hash từ số thô
    df_ids["id_number_hash"] = df_ids["id_number"].apply(lambda x: hash_id_number(x))
    
    # ---> MỚI: Tự động gán đường dẫn face_ref cho dữ liệu từ Excel
    df_ids["face_ref"] = df_ids["mock_identity_id"].apply(lambda x: f"faces_demo/{x}.npy")

    # Nạp dữ liệu vào bảng flights
    execute_values(cur, "INSERT INTO flights (flight_id, route, departure_time, gate, status) VALUES %s ON CONFLICT DO NOTHING;", df_flights[["flight_id", "route", "departure_time", "gate", "status"]].values.tolist())
    
    # ---> MỚI: Nạp dữ liệu vào bảng mock_identities (bổ sung cột face_ref ở cuối)
    execute_values(cur, "INSERT INTO mock_identities (mock_identity_id, name, dob, sex, id_number, id_number_hash, face_ref) VALUES %s ON CONFLICT DO NOTHING;", df_ids[["mock_identity_id", "name", "dob", "sex", "id_number", "id_number_hash", "face_ref"]].values.tolist())
    
    # Nạp dữ liệu vào bảng tickets
    execute_values(cur, "INSERT INTO tickets (ticket_id, passenger_name, id_number, flight_id, seat, booking_status) VALUES %s ON CONFLICT DO NOTHING;", df_tickets[["ticket_id", "passenger_name", "id_number", "flight_id", "seat", "booking_status"]].values.tolist())
    
    print("2. Bắt đầu sinh mở rộng quy mô lên 100,000 bản ghi với tên thật...")
    t0 = time.time()
    
    flights_list = df_flights['flight_id'].tolist()
    batch_size = 10000
    
    for start_idx in range(51, target_records + 1, batch_size):
        end_idx = min(start_idx + batch_size - 1, target_records)
        ids_batch, tickets_batch = [], []
        
        for i in range(start_idx, end_idx + 1):
            sex = random.choice(["M", "F"])
            name = generate_vn_name(sex)
            id_num = f"0012{str(random.randint(0, 99)).zfill(2)}{str(i).zfill(6)}"
            id_hash = hash_id_number(id_num)
            seat = f"{random.randint(1,40)}{random.choice(['A','B','C','D','E','F'])}"
            
            # ---> MỚI: Tự động sinh đường dẫn khuôn mặt
            face_ref = f"faces_demo/MID{i:06d}.npy"
            
            # ---> MỚI: Đưa face_ref vào tuple chuẩn cấu trúc 7 cột
            ids_batch.append((f"MID{i:06d}", name, "2000-01-01", sex, id_num, id_hash, face_ref))
            tickets_batch.append((f"TK{i:06d}", name, id_num, random.choice(flights_list), seat, "CONFIRMED"))
            
        # ---> MỚI: Lệnh INSERT có chứa cột face_ref
        execute_values(cur, "INSERT INTO mock_identities (mock_identity_id, name, dob, sex, id_number, id_number_hash, face_ref) VALUES %s ON CONFLICT DO NOTHING;", ids_batch)
        execute_values(cur, "INSERT INTO tickets (ticket_id, passenger_name, id_number, flight_id, seat, booking_status) VALUES %s ON CONFLICT DO NOTHING;", tickets_batch)
        
        conn.commit()
        print(f" -> Đã nạp xong {end_idx:,}/{target_records:,} bản ghi...")

    print(f"Hoàn tất! Thời gian chạy mô phỏng tải: {time.time() - t0:.2f} giây.")
    cur.close(); conn.close()

if __name__ == "__main__":
    scale_database()