"""
VanSetu GreenTech — Server-Side Authentication & Authorization Layer (Priority 1).

Implements strict Role-Based Access Control (RBAC) for municipal field assessments,
audit reviews, model promotion, and outcome monitoring.

Rules:
1. Client-supplied reviewer identity and roles are NEVER trusted.
2. Every request is verified against server-side accredited user records.
3. Explicit permission matrix for Assessors, Reviewers, Senior Reviewers, and Admins.
4. Reviewers are strictly prohibited from approving their own field assessments.
5. In-memory sliding-window rate limiting prevents API abuse.
"""
from __future__ import annotations

import hashlib
import hmac
import os
import time
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional, Set, Tuple
from fastapi import Header, HTTPException, Request, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, Field


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
    MANAGE_USERS = "MANAGE_USERS"
    MANAGE_REGISTRY = "MANAGE_REGISTRY"


# Authoritative role-permission mappings
ROLE_PERMISSIONS: Dict[ReviewerRole, Set[Permission]] = {
    ReviewerRole.FIELD_ASSESSOR: {
        Permission.SUBMIT_ASSESSMENT,
        Permission.SUBMIT_OUTCOME,
    },
    ReviewerRole.AUTHORIZED_REVIEWER: {
        Permission.SUBMIT_ASSESSMENT,
        Permission.REVIEW_ASSESSMENT,
        Permission.CORRECT_ASSESSMENT,
        Permission.SUBMIT_OUTCOME,
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


# Pre-seeded accredited municipal accounts for development and authorized testing
# In production, tokens are loaded from securely managed environment secrets or KMS.
SEEDED_USERS: Dict[str, AuthenticatedUser] = {
    "token_field_pwd_7104": AuthenticatedUser(
        user_id="PWD_ENG_7104",
        username="suresh.kumar",
        full_name="Suresh Kumar (Field Engineer)",
        role=ReviewerRole.FIELD_ASSESSOR,
        organization="Public Works Department (PWD) Delhi - South Division",
    ),
    "token_reviewer_mcd_3012": AuthenticatedUser(
        user_id="MCD_REV_3012",
        username="priya.verma",
        full_name="Priya Verma (Authorized Reviewer)",
        role=ReviewerRole.AUTHORIZED_REVIEWER,
        organization="Municipal Corporation of Delhi (MCD) - Horticulture Wing",
    ),
    "token_senior_delhi_001": AuthenticatedUser(
        user_id="CHIEF_PLANNER_DELHI",
        username="dr.arun.sharma",
        full_name="Dr. Arun Sharma (Chief Town Planner)",
        role=ReviewerRole.SENIOR_REVIEWER,
        organization="Delhi Urban Shelter Improvement Board & Planning Cell",
    ),
    "token_admin_delhi_root": AuthenticatedUser(
        user_id="ADMIN_SYSTEM_01",
        username="vansetu.admin",
        full_name="VanSetu System Administrator",
        role=ReviewerRole.ADMINISTRATOR,
        organization="State Climate Action Cell (GNCTD)",
    ),
}


class AuthManager:
    """Manages token resolution, user validation, and sliding-window rate limiting."""

    def __init__(self) -> None:
        self._users_by_token: Dict[str, AuthenticatedUser] = dict(SEEDED_USERS)
        # Sliding-window rate limiter: client_id -> list of unix timestamps
        self._rate_limits: Dict[str, List[float]] = defaultdict(list)
        self.rate_limit_window_seconds = 60.0
        self.rate_limit_max_requests = 60

    def register_user(self, token: str, user: AuthenticatedUser) -> None:
        self._users_by_token[token] = user

    def authenticate_token(self, token: str) -> Optional[AuthenticatedUser]:
        if not token:
            return None
        # Constant-time token lookup across registered tokens
        token_clean = token.strip()
        for reg_token, user in self._users_by_token.items():
            if hmac.compare_digest(reg_token, token_clean):
                if user.is_active:
                    return user
                return None
        return None

    def check_rate_limit(self, client_key: str) -> bool:
        """Sliding-window rate limiter. Returns True if allowed, False if exceeded."""
        now = time.time()
        window_start = now - self.rate_limit_window_seconds
        timestamps = self._rate_limits[client_key]
        # Purge timestamps outside window
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
