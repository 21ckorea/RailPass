import base64
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.backends import default_backend
import os
import hashlib

from app.core.config import settings


def _get_key() -> bytes:
    """ENCRYPTION_KEY에서 32바이트 AES 키 생성"""
    key = settings.ENCRYPTION_KEY
    if not key:
        # 개발 환경용 기본 키 (프로덕션에서는 반드시 환경변수 설정)
        key = "dev-encryption-key-change-in-prod"
    # SHA-256으로 정확히 32바이트 생성
    return hashlib.sha256(key.encode()).digest()


def encrypt(plaintext: str) -> str:
    """문자열을 AES-GCM으로 암호화"""
    if not plaintext:
        return plaintext
    key = _get_key()
    aesgcm = AESGCM(key)
    nonce = os.urandom(12)  # 96-bit nonce
    ciphertext = aesgcm.encrypt(nonce, plaintext.encode("utf-8"), None)
    # nonce + ciphertext를 base64로 인코딩
    return base64.urlsafe_b64encode(nonce + ciphertext).decode("utf-8")


def decrypt(token: str) -> str:
    """AES-GCM으로 암호화된 문자열 복호화"""
    if not token:
        return token
    try:
        key = _get_key()
        aesgcm = AESGCM(key)
        data = base64.urlsafe_b64decode(token.encode("utf-8"))
        nonce, ciphertext = data[:12], data[12:]
        return aesgcm.decrypt(nonce, ciphertext, None).decode("utf-8")
    except Exception:
        return ""
