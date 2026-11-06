import os
import qrcode

import psycopg2
DB_CONFIG = {"host": "localhost", "database": "airport_sim", "user": "postgres", "password": "Thanh6624", "port": 5432}
QR_OUT_DIR = "../../data/qr_out"

cases = ["01_valid", "02_cancelled", "03_mismatch"]
for c in cases: 
    os.makedirs(f"{QR_OUT_DIR}/{c}", exist_ok=True)

def export_cccd_qrs():
    print("1. Đang truy vấn bảng 'mock_identities' để in thẻ CCCD...")
    conn = psycopg2.connect(**DB_CONFIG)
    cur = conn.cursor()
    
    # CHỈ TRUY VẤN BẢNG MOCK_IDENTITIES (Không liên quan đến vé)
    cur.execute("""
        SELECT mock_identity_id, id_number, name, TO_CHAR(dob, 'DDMMYYYY'), sex 
        FROM mock_identities 
        ORDER BY mock_identity_id ASC LIMIT 15;
    """)
    rows = cur.fetchall()
    
    for idx, row in enumerate(rows):
        mid, id_num, name, dob_str, sex = row
        
        if idx < 5:
            folder = cases[0]
            cccd_qr = f"CCCD|{mid}|{id_num}|{name}|{dob_str}|{sex}"
        elif idx < 10:
            folder = cases[1]
            cccd_qr = f"CCCD|{mid}|{id_num}|{name}|{dob_str}|{sex}"
        else:
            folder = cases[2]
            # KỊCH BẢN BẪY: Lấy thông tin người số 1 (An Hoàng Anh) để nặn ra thẻ mạo danh
            m_mid, m_id_num, m_name, m_dob_str, m_sex = rows[0]
            cccd_qr = f"CCCD|{m_mid}|{m_id_num}|{m_name}|{m_dob_str}|{m_sex}"
            
        qr = qrcode.make(cccd_qr)
        qr.save(f"{QR_OUT_DIR}/{folder}/{mid}_CCCD.png")
        
    cur.close(); conn.close()

def export_ticket_qrs():
    print("2. Đang truy vấn bảng 'tickets' để in QR Vé máy bay...")
    conn = psycopg2.connect(**DB_CONFIG)
    cur = conn.cursor()
    
    # CHỈ TRUY VẤN BẢNG TICKETS (Không liên quan đến CSDL cư dân)
    cur.execute("""
        SELECT ticket_id, flight_id, seat, passenger_name, id_number 
        FROM tickets 
        ORDER BY ticket_id ASC LIMIT 15;
    """)
    rows = cur.fetchall()
    
    for idx, row in enumerate(rows):
        t_id, f_id, seat, name, id_num = row
        
        if idx < 5:
            folder = cases[0]
        elif idx < 10:
            folder = cases[1]
        else:
            folder = cases[2]
            
        # Mã QR Vé máy bay chuẩn, hoàn toàn tĩnh
        ticket_qr = f"TICKET|{t_id}|{f_id}|{seat}|{name}|{id_num}"
        qr = qrcode.make(ticket_qr)
        qr.save(f"{QR_OUT_DIR}/{folder}/{t_id}_TICKET.png")
        
    cur.close(); conn.close()

if __name__ == "__main__":
    export_cccd_qrs()
    export_ticket_qrs()
    print("Hoàn tất! QR Vé và CCCD đã được xuất từ 2 nguồn Database hoàn toàn độc lập.")