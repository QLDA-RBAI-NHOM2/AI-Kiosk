import cv2
import numpy as np
import os

# Trỏ đường dẫn model về thư mục models của dự án
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
YUNET_PATH = os.path.join(BASE_DIR, "models", "face_detection_yunet_2023mar.onnx")
SFACE_PATH = os.path.join(BASE_DIR, "models", "face_recognition_sface_2021dec.onnx")

EKYC_THRESHOLD = 0.5

def get_head_turn_ratio(face):
    x_re, y_re = face[4], face[5]
    x_le, y_le = face[6], face[7]
    x_nose, y_nose = face[8], face[9]

    x_left_eye_img = min(x_re, x_le)
    x_right_eye_img = max(x_re, x_le)

    dist_left = x_nose - x_left_eye_img
    dist_right = x_right_eye_img - x_nose

    if dist_right <= 0: dist_right = 0.001
    return dist_left / dist_right

def capture_id_card(cap, detector, recognizer):
    """Hàm chụp ảnh CCCD trực tiếp bằng Webcam"""
    print("\n--- GIAI DOAN 1: CHUP ANH CCCD ---")
    print("[*] Hãy đưa Căn cước công dân vào trước Camera.")
    print("[*] Nhấn phím SPACE để chụp, hoặc 'q' để thoát.")
    
    ref_feature = None
    id_img = None

    while True:
        ret, frame = cap.read()
        if not ret: break
        
        display_frame = frame.copy()
        h, w, _ = display_frame.shape
        
        # Vẽ khung hướng dẫn (giả lập khung căn chỉnh CCCD)
        cv2.rectangle(display_frame, (int(w*0.15), int(h*0.3)), (int(w*0.85), int(h*0.7)), (0, 255, 255), 2)
        cv2.putText(display_frame, "Dat CCCD vao khung - Nhan SPACE de chup", (50, 50), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 255), 2)

        cv2.imshow("Buoc 1: Chup CCCD", display_frame)
        
        key = cv2.waitKey(1) & 0xFF
        if key == 32: # Phím Space
            id_img = frame.copy()
            break
        elif key == ord('q') or key == 27:
            break

    if id_img is not None:
        # Xử lý trích xuất khuôn mặt từ ảnh CCCD vừa chụp
        h, w = id_img.shape[:2]
        detector.setInputSize((w, h))
        _, faces = detector.detect(id_img)
        
        if faces is None:
            print("[-] Loi: Khong tim thay khuon mat tren CCCD! Thu lai.")
            return None, None
            
        face = faces[0]
        face_aligned = recognizer.alignCrop(id_img, face)
        # Làm nét ảnh chụp từ webcam (vì webcam thường nhiễu)
        face_denoised = cv2.fastNlMeansDenoisingColored(face_aligned, None, 10, 10, 7, 21)
        ref_feature = recognizer.feature(face_denoised)
        
        print("[+] Da chup va trich xuat thanh cong khuon mat tu CCCD!")
        cv2.imshow("Anh CCCD da chup", id_img)
        cv2.waitKey(1000) # Hiển thị ảnh CCCD 1 giây
        cv2.destroyWindow("Anh CCCD da chup")
        cv2.destroyWindow("Buoc 1: Chup CCCD")

    return ref_feature, id_img

def main():
    print("=== KHOI TAO HE THONG eKYC DEMO ===")
    if not os.path.exists(YUNET_PATH) or not os.path.exists(SFACE_PATH):
        print(f"[-] Loi: Khong tim thay file model trong thu muc 'models/'")
        return

    detector = cv2.FaceDetectorYN.create(YUNET_PATH, "", (320, 320))
    recognizer = cv2.FaceRecognizerSF.create(SFACE_PATH, "")
    
    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        print("[-] Loi: Khong the mo Webcam!")
        return

    # --- BƯỚC 1: CHỤP CCCD ---
    ref_feature, id_img = capture_id_card(cap, detector, recognizer)
    if ref_feature is None:
        cap.release()
        cv2.destroyAllWindows()
        return

    # --- BƯỚC 2: LIVENESS & SO KHỚP ---
    print("\n--- GIAI DOAN 2: LIVENESS TEST & XAC THUC ---")
    liveness_step = 0
    ui_color = (0, 255, 255)
    match_result = ""
    similarity_score = 0.0

    while True:
        ret, frame = cap.read()
        if not ret: break
        
        frame = cv2.flip(frame, 1)
        h, w, _ = frame.shape
        detector.setInputSize((w, h))
        _, faces = detector.detect(frame)
        
        cv2.putText(frame, "B2: LIVENESS TEST", (20, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
        
        if faces is not None:
            face = faces[0]
            ratio = get_head_turn_ratio(face)
            
            cv2.circle(frame, (int(face[4]), int(face[5])), 3, (0, 255, 0), -1)
            cv2.circle(frame, (int(face[6]), int(face[7])), 3, (0, 255, 0), -1)
            cv2.circle(frame, (int(face[8]), int(face[9])), 3, (0, 0, 255), -1)

            if liveness_step == 0:
                instruction = "1. Vui long QUAY MAT SANG TRAI"
                if ratio > 1.8: liveness_step = 1
            elif liveness_step == 1:
                instruction = "2. Vui long QUAY MAT SANG PHAI"
                if ratio < 0.55: liveness_step = 2
            elif liveness_step == 2:
                instruction = "3. Vui long NHIN THANG vao camera"
                if 0.7 < ratio < 1.3: 
                    liveness_step = 3
                    instruction = "Dang xac thuc..."
            elif liveness_step == 3:
                face_aligned = recognizer.alignCrop(frame, face)
                cam_feature = recognizer.feature(face_aligned)
                
                similarity_score = recognizer.match(ref_feature, cam_feature, cv2.FaceRecognizerSF_FR_COSINE)
                if similarity_score >= EKYC_THRESHOLD:
                    match_result = "KHOP (Chinh Chu)"
                    ui_color = (0, 255, 0)
                else:
                    match_result = "KHONG KHOP (Gia Mao)"
                    ui_color = (0, 0, 255)
                liveness_step = 4
                
            elif liveness_step == 4:
                instruction = "Hoan thanh! Nhan 'q' de thoat."
                cv2.putText(frame, f"Ket qua: {match_result}", (20, 90), cv2.FONT_HERSHEY_SIMPLEX, 0.7, ui_color, 2)
                cv2.putText(frame, f"Cosine: {similarity_score:.3f}", (20, 120), cv2.FONT_HERSHEY_SIMPLEX, 0.6, ui_color, 2)

            cv2.putText(frame, instruction, (20, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.7, ui_color if liveness_step == 4 else (0, 255, 255), 2)
        else:
            cv2.putText(frame, "Khong tim thay khuon mat!", (20, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)

        cv2.imshow("He Thong eKYC", frame)
        
        key = cv2.waitKey(1) & 0xFF
        if key == ord('q') or key == 27: 
            break
            
    cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    main()