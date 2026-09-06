from pathlib import Path

from .config import BROWSE_ROOT


def _has_any_entries(path: Path) -> bool:
    try:
        return any(path.iterdir())
    except OSError:
        return False


def detect_environment() -> dict:
    is_container = Path("/.dockerenv").exists()

    is_wsl = False
    try:
        version_text = Path("/proc/version").read_text(encoding="utf-8", errors="ignore").lower()
        is_wsl = "microsoft" in version_text or "wsl" in version_text
    except OSError:
        pass

    if is_wsl:
        host_os_guess = "windows"
    elif is_container:
        host_os_guess = "linux"
    else:
        host_os_guess = "unknown"

    browse_available = BROWSE_ROOT.is_dir() and _has_any_entries(BROWSE_ROOT)

    return {
        "isContainer": is_container,
        "isWsl": is_wsl,
        "hostOsGuess": host_os_guess,
        "browseAvailable": browse_available,
        "browseRoot": str(BROWSE_ROOT),
    }
