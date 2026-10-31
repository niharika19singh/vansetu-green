"""
VanSetu GreenTech — Server-Side Authentication & Authorization Layer.

Implements strict Role-Based Access Control (RBAC) with keyed HMAC-SHA256 token indexing,
secure credential lifecycle (creation, transactional rotation, revocation),
and zero exposed plaintext tokens in source code.

Rules:
1. Client-supplied reviewer identity and roles are NEVER trusted.
2. Every request is verified against server-side accredited hashed user records.
3. Explicit permission matrix for Assessors, Reviewers, Senior Reviewers, and Admins.
4. Reviewers are strictly prohibited from approving their own field assessments.
5. Tokens are hashed with keyed HMAC-SHA256 using server environment secret; raw tokens are never persisted.
6. In-memory sliding-window rate limiting prevents API abuse (process-local per worker).
"""
from __future__ import annotations

import hashlib
import hmac
import json
import logging
import os
import secrets
import sqlite3
import time
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple
from fastapi import Header, HTTPException, Request, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

logger = logging.getLogger("vansetu.auth")

# Keyed HMAC Secret for deterministic, indexed O(1) token lookups
_DEFAULT_DEV_SECRET = "vansetu_dev_hmac_secret_delhi_2026_unconfigured_fallback"


def get_token_hmac_secret() -> str:
    """Retrieve server HMAC secret from environment or fallback with warning in dev."""
    secret = (
        os.getenv("VANSETU_TOKEN_HMAC_SECRET")
        or os.getenv("VANSETU_API_AUTH_SECRET")
        or ""
    ).strip()
    if not secret:
        # In production environments, missing HMAC secret must fail closed
        if os.getenv("VANSETU_ENV", "development").lower() in ("production", "prod"):
            raise RuntimeError(
                "CRITICAL SECURITY CONFIGURATION ERROR: VANSETU_TOKEN_HMAC_SECRET must be set in production."
            )
        return _DEFAULT_DEV_SECRET
    return secret


class ReviewerRole(str, Enum):
    FIELD_ASSESSOR = "FIELD_ASSESSOR"
    AUTHORIZED_REVIEWER = "AUTHORIZED_REVIEWER"
    SENIOR_REVIEWER = "SENIOR_REVIEWER"
    ADMINISTRATOR = "ADMINISTRATOR"


# Backward compatibility alias
UserRole = ReviewerRole


class Permission(str, Enum):
    SUBMIT_ASSESSMENT = "SUBMIT_ASSESSMENT"
    REVIEW_ASSESSMENT = "REVIEW_ASSESSMENT"
    CORRECT_ASSESSMENT = "CORRECT_ASSESSMENT"
    APPROVE_ASSESSMENT = "APPROVE_ASSESSMENT"
    REJECT_ASSESSMENT = "REJECT_ASSESSMENT"
    PROMOTE_MODEL = "PROMOTE_MODEL"
    ROLLBACK_MODEL = "ROLLBACK_MODEL"
    SUBMIT_OUTCOME = "SUBMIT_OUTCOME"
    VERIFY_OUTCOME = "VERIFY_OUTCOME"
    VERIFY_EVIDENCE = "VERIFY_EVIDENCE"
    VIEW_EVIDENCE = "VIEW_EVIDENCE"
    MANAGE_USERS = "MANAGE_USERS"
    MANAGE_REGISTRY = "MANAGE_REGISTRY"


# Authoritative role-permission mappings
ROLE_PERMISSIONS: Dict[ReviewerRole, Set[Permission]] = {
    ReviewerRole.FIELD_ASSESSOR: {
        Permission.SUBMIT_ASSESSMENT,
        Permission.SUBMIT_OUTCOME,
        Permission.VIEW_EVIDENCE,
    },
    ReviewerRole.AUTHORIZED_REVIEWER: {
        Permission.SUBMIT_ASSESSMENT,
        Permission.REVIEW_ASSESSMENT,
        Permission.CORRECT_ASSESSMENT,
        Permission.SUBMIT_OUTCOME,
        Permission.VERIFY_EVIDENCE,
        Permission.VIEW_EVIDENCE,
    },
    ReviewerRole.SENIOR_REVIEWER: {
        Permission.SUBMIT_ASSESSMENT,
        Permission.REVIEW_ASSESSMENT,
        Permission.CORRECT_ASSESSMENT,
        Permission.APPROVE_ASSESSMENT,
        Permission.REJECT_ASSESSMENT,
        Permission.PROMOTE_MODEL,
        Permission.VERIFY_OUTCOME,
        Permission.SUBMIT_OUTCOME,
        Permission.VERIFY_EVIDENCE,
        Permission.VIEW_EVIDENCE,
    },
    ReviewerRole.ADMINISTRATOR: set(Permission),
}


@dataclass(frozen=True)
class AuthenticatedUser:
    user_id: str
    username: str
    full_name: str
    role: ReviewerRole
    organization: str
    is_active: bool = True
    created_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

    def has_permission(self, permission: Permission) -> bool:
        if not self.is_active:
            return False
        perms = ROLE_PERMISSIONS.get(self.role, set())
        return permission in perms


def redact_token(token: Optional[str]) -> str:
    """Safely redact sensitive credentials for logs and audit messages."""
    if not token:
        return "[EMPTY]"
    clean = token.strip()
    if len(clean) <= 8:
        return "[REDACTED]"
    return f"{clean[:4]}...{clean[-4:]}"


def compute_token_hmac(raw_token: str, secret: Optional[str] = None) -> str:
    """Compute keyed HMAC-SHA256 digest for constant-time, indexed O(1) token lookups."""
    sec = secret or get_token_hmac_secret()
    return hmac.new(
        sec.encode("utf-8"),
        raw_token.strip().encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()


class CredentialStore:
    """
    Server-side credential store for accredited municipal officer tokens.
    Persists keyed HMAC-SHA256 digests in SQLite with direct indexed lookup.
    Raw tokens are NEVER stored in plaintext.
    """

    def __init__(self, db_path: Optional[Path] = None, hmac_secret: Optional[str] = None) -> None:
        self.hmac_secret = hmac_secret or get_token_hmac_secret()
        if db_path:
            self.db_path = Path(db_path)
        else:
            data_dir = Path(__file__).parent.parent.parent / "data"
            data_dir.mkdir(parents=True, exist_ok=True)
            self.db_path = data_dir / "auth_credentials.sqlite"
        self._init_db()

    def _get_conn(self) -> sqlite3.Connection:
        conn = sqlite3.connect(str(self.db_path), timeout=15.0)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self) -> None:
        with self._get_conn() as conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS api_credentials (
                    token_id TEXT PRIMARY KEY,
                    token_hmac TEXT UNIQUE,
                    token_prefix TEXT,
                    token_hash TEXT,
                    salt TEXT,
                    user_id TEXT NOT NULL,
                    username TEXT NOT NULL,
                    full_name TEXT NOT NULL,
                    role TEXT NOT NULL,
                    organization TEXT NOT NULL,
                    is_active INTEGER NOT NULL DEFAULT 1,
                    created_at TEXT NOT NULL,
                    expires_at TEXT,
                    revoked_at TEXT
                );
                """
            )
            # Automatic schema migration for pre-existing databases
            cur = conn.execute("PRAGMA table_info(api_credentials)")
            existing_cols = {row[1] for row in cur.fetchall()}
            if "token_hmac" not in existing_cols and len(existing_cols) > 0:
                conn.execute("ALTER TABLE api_credentials ADD COLUMN token_hmac TEXT")
            if "token_prefix" not in existing_cols and len(existing_cols) > 0:
                conn.execute("ALTER TABLE api_credentials ADD COLUMN token_prefix TEXT")

            conn.execute(
                "CREATE INDEX IF NOT EXISTS idx_cred_token_hmac ON api_credentials(token_hmac);"
            )
            conn.execute(
                "CREATE INDEX IF NOT EXISTS idx_cred_user_id ON api_credentials(user_id);"
            )
            conn.execute(
                "CREATE INDEX IF NOT EXISTS idx_cred_active ON api_credentials(is_active);"
            )
            conn.commit()

    def count_tokens(self) -> int:
        with self._get_conn() as conn:
            row = conn.execute(
                "SELECT COUNT(*) AS cnt FROM api_credentials WHERE is_active = 1 AND revoked_at IS NULL"
            ).fetchone()
            return int(row["cnt"]) if row else 0

    def create_token(
        self,
        user: AuthenticatedUser,
        expires_at: Optional[str] = None,
    ) -> str:
        """
        Generate a cryptographically secure random token, store its keyed HMAC-SHA256,
        and return the raw token. The raw token is returned ONCE and never saved.
        """
        raw_token = f"vs_{secrets.token_urlsafe(32)}"
        token_hmac = compute_token_hmac(raw_token, self.hmac_secret)
        token_id = f"tok_{secrets.token_hex(8)}"
        token_prefix = raw_token[:7]
        created_at = datetime.now(timezone.utc).isoformat()

        legacy_compat_hash = f"hmac_{token_id}"
        with self._get_conn() as conn:
            conn.execute(
                """
                INSERT INTO api_credentials (
                    token_id, token_hmac, token_prefix, token_hash, salt, user_id,
                    username, full_name, role, organization, is_active,
                    created_at, expires_at, revoked_at
                ) VALUES (?, ?, ?, ?, '', ?, ?, ?, ?, ?, 1, ?, ?, NULL)
                """,
                (
                    token_id,
                    token_hmac,
                    token_prefix,
                    legacy_compat_hash,
                    user.user_id,
                    user.username,
                    user.full_name,
                    user.role.value,
                    user.organization,
                    created_at,
                    expires_at,
                ),
            )
            conn.commit()
        return raw_token

    def register_known_token(
        self,
        raw_token: str,
        user: AuthenticatedUser,
        expires_at: Optional[str] = None,
    ) -> None:
        """Register a specific token (used for environment bootstrapping or test isolation)."""
        token_hmac = compute_token_hmac(raw_token, self.hmac_secret)
        token_id = f"tok_{secrets.token_hex(8)}"
        token_prefix = raw_token[:7]
        created_at = datetime.now(timezone.utc).isoformat()

        with self._get_conn() as conn:
            conn.execute(
                """
                INSERT OR REPLACE INTO api_credentials (
                    token_id, token_hmac, token_prefix, token_hash, salt, user_id,
                    username, full_name, role, organization, is_active,
                    created_at, expires_at, revoked_at
                ) VALUES (?, ?, ?, '', '', ?, ?, ?, ?, ?, 1, ?, ?, NULL)
                """,
                (
                    token_id,
                    token_hmac,
                    token_prefix,
                    user.user_id,
                    user.username,
                    user.full_name,
                    user.role.value,
                    user.organization,
                    created_at,
                    expires_at,
                ),
            )
            conn.commit()

    def authenticate(self, raw_token: str) -> Optional[AuthenticatedUser]:
        """
        Authenticate a raw token via O(1) indexed keyed HMAC-SHA256 lookup in constant time.
        Includes self-migrating backward compatibility for any legacy salt/hash rows.
        """
        if not raw_token or not raw_token.strip():
            return None
        token_clean = raw_token.strip()
        cand_hmac = compute_token_hmac(token_clean, self.hmac_secret)
        now_iso = datetime.now(timezone.utc).isoformat()

        with self._get_conn() as conn:
            # 1. Fast indexed O(1) lookup by token_hmac
            row = conn.execute(
                """
                SELECT token_id, token_hmac, user_id, username, full_name,
                       role, organization, is_active, expires_at, revoked_at
                FROM api_credentials
                WHERE token_hmac = ? AND is_active = 1 AND revoked_at IS NULL
                """,
                (cand_hmac,),
            ).fetchone()

            if row:
                if row["expires_at"] and row["expires_at"] < now_iso:
                    return None
                if hmac.compare_digest(row["token_hmac"], cand_hmac):
                    try:
                        role_enum = ReviewerRole(row["role"])
                    except ValueError:
                        role_enum = ReviewerRole.FIELD_ASSESSOR
                    return AuthenticatedUser(
                        user_id=row["user_id"],
                        username=row["username"],
                        full_name=row["full_name"],
                        role=role_enum,
                        organization=row["organization"],
                        is_active=bool(row["is_active"]),
                    )

            # 2. Self-migrating fallback for legacy salt/hash rows where token_hmac is NULL
            legacy_rows = conn.execute(
                """
                SELECT token_id, token_hash, salt, user_id, username, full_name,
                       role, organization, is_active, expires_at, revoked_at
                FROM api_credentials
                WHERE (token_hmac IS NULL OR token_hmac = '')
                  AND is_active = 1 AND revoked_at IS NULL
                """
            ).fetchall()

            for r in legacy_rows:
                if r["expires_at"] and r["expires_at"] < now_iso:
                    continue
                salt = r["salt"] or ""
                legacy_hash = hashlib.sha256((salt + token_clean).encode("utf-8")).hexdigest()
                if hmac.compare_digest(legacy_hash, r["token_hash"] or ""):
                    # Upgrade legacy row with keyed HMAC digest
                    conn.execute(
                        "UPDATE api_credentials SET token_hmac = ?, token_prefix = ? WHERE token_id = ?",
                        (cand_hmac, token_clean[:7], r["token_id"]),
                    )
                    conn.commit()
                    try:
                        role_enum = ReviewerRole(r["role"])
                    except ValueError:
                        role_enum = ReviewerRole.FIELD_ASSESSOR
                    return AuthenticatedUser(
                        user_id=r["user_id"],
                        username=r["username"],
                        full_name=r["full_name"],
                        role=role_enum,
                        organization=r["organization"],
                        is_active=bool(r["is_active"]),
                    )

        return None

    def revoke_token(self, raw_token: str) -> bool:
        """Revoke a token by its raw representation."""
        if not raw_token:
            return False
        cand_hmac = compute_token_hmac(raw_token, self.hmac_secret)
        now_iso = datetime.now(timezone.utc).isoformat()
        with self._get_conn() as conn:
            cur = conn.execute(
                "UPDATE api_credentials SET is_active = 0, revoked_at = ? WHERE token_hmac = ? AND is_active = 1",
                (now_iso, cand_hmac),
            )
            conn.commit()
            return cur.rowcount > 0

    def rotate_token(self, old_raw_token: str) -> Optional[Tuple[str, AuthenticatedUser]]:
        """
        Atomically revoke the old token and issue a fresh new token for the user in a single transaction.
        Guarantees no window of vulnerability where old is revoked but new fails to persist.
        """
        user = self.authenticate(old_raw_token)
        if not user:
            return None

        old_hmac = compute_token_hmac(old_raw_token, self.hmac_secret)
        new_raw_token = f"vs_{secrets.token_urlsafe(32)}"
        new_hmac = compute_token_hmac(new_raw_token, self.hmac_secret)
        new_token_id = f"tok_{secrets.token_hex(8)}"
        new_prefix = new_raw_token[:7]
        now_iso = datetime.now(timezone.utc).isoformat()

        legacy_compat_hash = f"hmac_{new_token_id}"
        with self._get_conn() as conn:
            with conn:  # Atomic SQLite transaction (BEGIN / COMMIT)
                # 1. Revoke the old token
                conn.execute(
                    "UPDATE api_credentials SET is_active = 0, revoked_at = ? WHERE token_hmac = ?",
                    (now_iso, old_hmac),
                )
                # 2. Insert the fresh new replacement token
                conn.execute(
                    """
                    INSERT INTO api_credentials (
                        token_id, token_hmac, token_prefix, token_hash, salt, user_id,
                        username, full_name, role, organization, is_active,
                        created_at, expires_at, revoked_at
                    ) VALUES (?, ?, ?, ?, '', ?, ?, ?, ?, ?, 1, ?, NULL, NULL)
                    """,
                    (
                        new_token_id,
                        new_hmac,
                        new_prefix,
                        legacy_compat_hash,
                        user.user_id,
                        user.username,
                        user.full_name,
                        user.role.value,
                        user.organization,
                        now_iso,
                    ),
                )
        return new_raw_token, user


class AuthManager:
    """
    Manages token resolution, credential lifecycle, and sliding-window rate limiting.
    
    NOTE ON RATE LIMITING:
    Rate limiting in this class is strictly PROCESS-LOCAL (in-memory per worker process).
    In multi-worker production environments (e.g. Uvicorn/Gunicorn with multiple workers or Kubernetes pods),
    distributed rate limiting must be deployed via Redis or an edge proxy (e.g. Cloudflare / Nginx).
    """

    def __init__(self, store: Optional[CredentialStore] = None) -> None:
        self.store = store or CredentialStore()
        # Ephemeral memory store for fast testing/mocking
        self._ephemeral_tokens: Dict[str, AuthenticatedUser] = {}
        # Process-local sliding-window rate limiter: client_id -> list of unix timestamps
        self._rate_limits: Dict[str, List[float]] = defaultdict(list)
        self.rate_limit_window_seconds = 60.0
        self.rate_limit_max_requests = 60
        self._bootstrap_if_configured()

    def _bootstrap_if_configured(self) -> None:
        """Load secure tokens from environment JSON if configured."""
        env_tokens = os.getenv("VANSETU_MUNICIPAL_TOKENS_JSON")
        if env_tokens:
            try:
                entries = json.loads(env_tokens)
                for item in entries:
                    user = AuthenticatedUser(
                        user_id=item["user_id"],
                        username=item["username"],
                        full_name=item["full_name"],
                        role=ReviewerRole(item["role"]),
                        organization=item["organization"],
                    )
                    self.store.register_known_token(item["token"], user)
            except Exception:
                pass

    def register_user(self, token: str, user: AuthenticatedUser) -> None:
        """Register a token in memory (and persist in store) for testing."""
        self._ephemeral_tokens[token] = user
        self.store.register_known_token(token, user)

    def provision_test_user(
        self,
        role: ReviewerRole,
        user_id: Optional[str] = None,
        username: Optional[str] = None,
        full_name: Optional[str] = None,
        organization: Optional[str] = None,
    ) -> Tuple[str, AuthenticatedUser]:
        """Utility for test suites to dynamically generate credentials without hardcoding."""
        uid = user_id or f"USER_{role.value}_{secrets.token_hex(4)}"
        u_name = username or f"user_{secrets.token_hex(4)}"
        f_name = full_name or f"Accredited Officer {role.value}"
        org = organization or "NCT Delhi Climate Infrastructure Cell"
        user = AuthenticatedUser(
            user_id=uid,
            username=u_name,
            full_name=f_name,
            role=role,
            organization=org,
        )
        token = self.store.create_token(user)
        self._ephemeral_tokens[token] = user
        return token, user

    def authenticate_token(self, token: str) -> Optional[AuthenticatedUser]:
        if not token:
            return None
        token_clean = token.strip()
        # 1. Check ephemeral test mappings (constant-time check)
        for reg_token, user in self._ephemeral_tokens.items():
            if hmac.compare_digest(reg_token, token_clean):
                if user.is_active:
                    return user
                return None
        # 2. Check hashed database store
        return self.store.authenticate(token_clean)

    def check_rate_limit(self, client_key: str) -> bool:
        """Process-local sliding-window rate limiter. Returns True if allowed, False if exceeded."""
        now = time.time()
        window_start = now - self.rate_limit_window_seconds
        timestamps = self._rate_limits[client_key]
        valid_timestamps = [t for t in timestamps if t > window_start]
        self._rate_limits[client_key] = valid_timestamps

        if len(valid_timestamps) >= self.rate_limit_max_requests:
            return False

        self._rate_limits[client_key].append(now)
        return True


# Global auth manager instance
_auth_manager = AuthManager()


def get_auth_manager() -> AuthManager:
    return _auth_manager


security_bearer = HTTPBearer(auto_error=False)


async def get_current_user(
    request: Request,
    auth_header: Optional[HTTPAuthorizationCredentials] = Security(security_bearer),
    x_api_key: Optional[str] = Header(None, alias="X-API-Key"),
) -> AuthenticatedUser:
    """
    FastAPI dependency that enforces server-side authentication.
    Accepts Bearer token or X-API-Key header.
    Rejects unauthenticated callers with HTTP 401 Unauthorized.
    """
    token: Optional[str] = None
    if auth_header and auth_header.credentials:
        token = auth_header.credentials
    elif x_api_key:
        token = x_api_key

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=(
                "Authentication required: Missing or invalid authorization token. "
                "Provide an accredited municipal bearer token or X-API-Key header."
            ),
            headers={"WWW-Authenticate": "Bearer"},
        )

    mgr = get_auth_manager()
    user = mgr.authenticate_token(token)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed: Invalid, revoked, or inactive accredited reviewer token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Apply rate limiting by authenticated user_id
    if not mgr.check_rate_limit(user.user_id):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Rate limit exceeded: Maximum {mgr.rate_limit_max_requests} requests per minute allowed.",
        )

    return user


def require_permission(perm: Permission):
    """Factory returning a dependency that enforces a specific permission."""
    async def permission_checker(current_user: AuthenticatedUser = Security(get_current_user)) -> AuthenticatedUser:
        if not current_user.has_permission(perm):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    f"Access Denied: Role '{current_user.role.value}' does not have "
                    f"required permission '{perm.value}'."
                ),
            )
        return current_user
    return permission_checker
