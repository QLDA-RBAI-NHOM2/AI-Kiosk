from deepface import DeepFace
import numpy as np
import os

OUT_DIR = "../../data/faces_demo"
os.makedirs(OUT_DIR, exist_ok=True)

def image_to_embedding(image_path, output_npy_path):
    print(f"Đang xử lý ảnh: {image_path}...")
    try:
        # Dùng model Facenet để trích xuất vector khuôn mặt
        result = DeepFace.represent(img_path=image_path, model_name="Facenet", enforce_detection=True)
        
        # DeepFace trả về một list. Ta lấy embedding của khuôn mặt đầu tiên
        embedding = np.array(result[0]["embedding"])
        np.save(output_npy_path, embedding)
        print(f" -> Thành công! Đã lưu vector ra: {output_npy_path}")
    except ValueError:
        print(f" -> THẤT BẠI: Không tìm thấy khuôn mặt nào trong ảnh {image_path}!")
    except Exception as e:
        print(f" -> LỖI HỆ THỐNG: {e}")

if __name__ == "__main__":
    # Gắn ảnh Phuc.jpg cho MID000001
    image_to_embedding("Phuc.jpg", f"{OUT_DIR}/MID000001.npy")
    
    # Gắn ảnh Vu.jpg cho MID000002
    image_to_embedding("Vu.jpg", f"{OUT_DIR}/MID000002.npy")
    
    print("Hoàn tất việc tạo dữ liệu Face Ref bằng DeepFace!")