from __future__ import annotations

import base64
import hashlib
import hmac
import secrets
from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt

from .config import get_settings

ALGORITHM = "HS256"


def hash_password(password: str, salt: str | None = None) -> str:
    salt_value = salt or secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt_value.encode("utf-8"),
        120_000,
    )
    encoded = base64.urlsafe_b64encode(digest).decode("utf-8")
    return f"{salt_value}${encoded}"


def verify_password(password: str, password_hash: str) -> bool:
    try:
        salt_value, encoded = password_hash.split("$", 1)
    except ValueError:
        return False
    candidate = hash_password(password, salt_value)
    return hmac.compare_digest(candidate, password_hash)


def create_access_token(subject: str, role: str, expires_minutes: int | None = None) -> str:
    settings = get_settings()
    expires = datetime.now(timezone.utc) + timedelta(minutes=expires_minutes or settings.jwt_expires_minutes)
    payload = {"sub": subject, "role": role, "exp": expires}
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=ALGORITHM)


def decode_access_token(token: str) -> dict[str, str]:
    settings = get_settings()
    try:
        payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[ALGORITHM])
        return {"sub": str(payload["sub"]), "role": str(payload["role"])}
    except JWTError as exc:  # pragma: no cover - mapped to auth error
        raise ValueError("invalid_token") from exc
