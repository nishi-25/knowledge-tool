from fastapi import APIRouter

from ..sysinfo import detect_environment
from ..admin_store import is_login_enabled
from ..config import APP_MODE

router = APIRouter(prefix="/api/system", tags=["system"])


@router.get("/info")
def system_info():
    return {**detect_environment(), "loginEnabled": is_login_enabled(), "mode": APP_MODE}
