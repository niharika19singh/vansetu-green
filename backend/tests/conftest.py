"""
VanSetu GreenTech — Global Pytest Fixtures & Environment Configuration.

Ensures that automated tests operate with cryptographically strong, isolated test secrets
and that no production tokens or real credentials can be verified against test runs.
"""
import os
import secrets
import pytest


@pytest.fixture(autouse=True, scope="session")
def setup_test_hmac_secret():
    """Inject an ephemeral, cryptographically strong test HMAC secret (>= 32 chars)."""
    current = os.getenv("VANSETU_TOKEN_HMAC_SECRET")
    if not current or len(current.strip()) < 32:
        # Generate an ephemeral 64-character hex test secret
        ephemeral_secret = f"test_hmac_secret_delhi_2026_{secrets.token_hex(16)}"
        os.environ["VANSETU_TOKEN_HMAC_SECRET"] = ephemeral_secret
    yield
