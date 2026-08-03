"""Encrypted secret storage helper (Fernet).

Provides encrypt/decrypt helpers. If no FERNET_KEY env var is set,
auto-generates one at startup and stores in a state file (dev only — for prod, set FERNET_KEY in .env).
"""
import os
import logging
from pathlib import Path
from cryptography.fernet import Fernet, InvalidToken

log = logging.getLogger("crypto")

_KEY_FILE = Path(os.environ.get("UPLOAD_DIR", "/app/backend/uploads")).parent / ".fernet.key"


def _load_or_create_key() -> bytes:
    env_key = os.environ.get("FERNET_KEY", "").strip()
    if env_key:
        try:
            Fernet(env_key.encode())
            return env_key.encode()
        except Exception:
            log.warning("FERNET_KEY in env is invalid; falling back to file-based key")

    if _KEY_FILE.exists():
        try:
            data = _KEY_FILE.read_bytes().strip()
            Fernet(data)
            return data
        except Exception:
            log.warning("Existing fernet key invalid; regenerating")

    key = Fernet.generate_key()
    try:
        _KEY_FILE.parent.mkdir(parents=True, exist_ok=True)
        _KEY_FILE.write_bytes(key)
        os.chmod(_KEY_FILE, 0o600)
        log.warning("Generated new Fernet key at %s. Set FERNET_KEY in .env for stability.", _KEY_FILE)
    except Exception as e:
        log.error("Could not persist Fernet key: %s", e)
    return key


_KEY = _load_or_create_key()
_FERNET = Fernet(_KEY)


def encrypt(plain: str) -> str:
    if plain is None:
        return ""
    return _FERNET.encrypt(plain.encode("utf-8")).decode("utf-8")


def decrypt(ciphertext: str) -> str:
    if not ciphertext:
        return ""
    try:
        return _FERNET.decrypt(ciphertext.encode("utf-8")).decode("utf-8")
    except InvalidToken:
        log.warning("Failed to decrypt token (key changed?)")
        return ""
