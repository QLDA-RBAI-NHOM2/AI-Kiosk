from fastapi import APIRouter

router = APIRouter(tags=["health"])
  
@router.get("/health")
def health() -> dict:
    """Kiểm tra backend còn sống không. Sau này thêm: DB kết nối được chưa, model AI load chưa."""
    return {"status": "ok"}
