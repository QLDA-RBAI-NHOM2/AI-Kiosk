#!/usr/bin/env bash
# Chặn file không được phép nằm trong repo (hợp đồng Điều 14, khoản 6.1).
set -uo pipefail
files=$(git ls-files)
fail=0

report() {
  echo "::error::$1"
  printf '%s\n' "$2"
  fail=1
}

hits=$(printf '%s\n' "$files" | grep -E -i '\.(onnx|pt|pth|h5|tflite|task|mp4|avi|mov|webm|sqlite3|db|pem|key)$' || true)
[ -n "$hits" ] && report "Model weights, video, DB dump hoặc khóa riêng không được commit" "$hits"

hits=$(printf '%s\n' "$files" | grep -E '(^|/)\.env(\.[^/]*)?$' | grep -v -E '(^|/)\.env\.example$' || true)
[ -n "$hits" ] && report "File .env không được commit (chỉ cho phép .env.example)" "$hits"

hits=$(printf '%s\n' "$files" | grep -E -i '\.(jpg|jpeg|png|bmp|webp|gif|tif|tiff|heic)$' | grep -v -E '^(docs|frontend)/' || true)
[ -n "$hits" ] && report "Ảnh ngoài docs/ và frontend/ không được commit (không lưu ảnh khuôn mặt thô)" "$hits"

hits=$(printf '%s\n' "$files" | grep -E '^docs/hoso/' || true)
[ -n "$hits" ] && report "Hồ sơ hợp đồng, thanh toán không được lưu trong repo" "$hits"

if [ "$fail" -eq 0 ]; then echo "OK: không có file bị cấm."; fi
exit "$fail"
