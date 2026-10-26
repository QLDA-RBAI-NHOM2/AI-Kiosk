def get_head_turn_ratio(face):
    """
    Tính tỷ lệ khoảng cách từ mũi đến 2 mắt để xác định góc quay đầu.
    """
    x_re, y_re = face[4], face[5]
    x_le, y_le = face[6], face[7]
    x_nose, y_nose = face[8], face[9]

    x_left_eye_img = min(x_re, x_le)
    x_right_eye_img = max(x_re, x_le)

    dist_left = x_nose - x_left_eye_img
    dist_right = x_right_eye_img - x_nose

    if dist_right <= 0: 
        dist_right = 0.001 # Tránh chia cho 0
        
    return dist_left / dist_right

def check_liveness_state(ratio, config):
    if ratio > config["left_ratio"]:
        return "TURNED_LEFT"
    elif ratio < config["right_ratio"]:
        return "TURNED_RIGHT"
    elif config["front_min"] < ratio < config["front_max"]:
        return "FACING_FRONT"
    return "UNKNOWN"