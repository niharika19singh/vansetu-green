"""
VanSetu GreenTech — Global Pytest Fixtures & Environment Configuration.

Ensures that automated tests operate with cryptographically strong, isolated test secrets
and that no production tokens or real credentials can be verified against test runs.
"""
import os
import secrets
import pytest

# Ensure test session has a valid HMAC secret from the very beginning of pytest collection
if not os.getenv("VANSETU_TOKEN_HMAC_SECRET") or len(os.getenv("VANSETU_TOKEN_HMAC_SECRET", "").strip()) < 32:
    os.environ["VANSETU_TOKEN_HMAC_SECRET"] = f"test_hmac_secret_delhi_2026_{secrets.token_hex(16)}"


def pytest_configure(config):
    """Pytest hook called before test collection begins."""
    if not os.getenv("VANSETU_TOKEN_HMAC_SECRET") or len(os.getenv("VANSETU_TOKEN_HMAC_SECRET", "").strip()) < 32:
        os.environ["VANSETU_TOKEN_HMAC_SECRET"] = f"test_hmac_secret_delhi_2026_{secrets.token_hex(16)}"


@pytest.fixture(autouse=True)
def ensure_test_hmac_secret(monkeypatch):
    """Ensure every test has a valid secret even if a previous test modifies it with monkeypatch."""
    current = os.getenv("VANSETU_TOKEN_HMAC_SECRET")
    if not current or len(current.strip()) < 32:
        monkeypatch.setenv(
            "VANSETU_TOKEN_HMAC_SECRET",
            f"test_hmac_secret_delhi_2026_{secrets.token_hex(16)}",
        )
