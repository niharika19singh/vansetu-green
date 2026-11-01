"""
VanSetu GreenTech — Authentication, User Profile & Role-Based Access Control Router.

Provides:
- GET /api/auth/me: Returns current user, verified role, permissions, and municipal organization.
- GET /api/auth/permissions: Lists current user permissions.
- POST /api/auth/demo-switch-role: Development/demonstration persona switching tool.
"""
from __future__ import annotations

import logging
import os
import secrets
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field

from ml.security.auth import (
    AuthenticatedUser,
    Permission,
    ReviewerRole,
    ROLE_PERMISSIONS,
    get_auth_manager,
    get_current_user,
    get_optional_current_user,
    PUBLIC_ANONYMOUS_USER,
)

logger = logging.getLogger("vansetu.routers.auth")

router = APIRouter(prefix="/api/auth", tags=["Authentication & RBAC"])


class DemoRoleSwitchRequest(BaseModel):
    role: Optional[str] = Field(default=None, description="Role to preview: 'government_admin', 'government_engineer', 'pro_professional', or 'public_citizen'")


@router.get("/me")
async def get_my_profile(
    current_user: AuthenticatedUser = Depends(get_optional_current_user),
) -> Dict[str, Any]:
    """
    Retrieve currently authenticated user profile, server-enforced role, and active permissions.
    If no authorization header is provided, returns the public guest profile.
    """
    perms = [p.value for p in ROLE_PERMISSIONS.get(current_user.role, set())]
    return {
        "user_id": current_user.user_id,
        "username": current_user.username,
        "full_name": current_user.full_name,
        "role": current_user.role.value,
        "organization": current_user.organization,
        "is_active": current_user.is_active,
        "permissions": sorted(perms),
        "created_at": current_user.created_at,
    }


@router.get("/permissions")
async def get_my_permissions(
    current_user: AuthenticatedUser = Depends(get_optional_current_user),
) -> Dict[str, Any]:
    """List permission strings for the current user role."""
    perms = [p.value for p in ROLE_PERMISSIONS.get(current_user.role, set())]
    return {
        "role": current_user.role.value,
        "permissions": sorted(perms),
    }


@router.post("/demo-switch-role")
async def demo_switch_role(
    req: Optional[DemoRoleSwitchRequest] = None,
    role: Optional[str] = Query(default=None),
) -> Dict[str, Any]:
    """
    Development-only persona provisioning tool for demonstration testing.
    Issues an ephemeral bearer token with 15-minute validity for the chosen role.
    Strictly rejected in production or when VANSETU_ENABLE_DEMO_AUTH is false.
    """
    env = os.getenv("VANSETU_ENV", "").strip().lower()
    demo_auth = os.getenv("VANSETU_ENABLE_DEMO_AUTH", "").strip().lower()
    if env != "development" or demo_auth != "true":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "Access Denied: Demo persona switching is strictly restricted to development environments "
                "with VANSETU_ENABLE_DEMO_AUTH=true. Production callers must use accredited bearer credentials."
            ),
        )

    target_role = (req.role if req and req.role else role) or ""
    auth_mgr = get_auth_manager()
    role_key = target_role.strip().lower()

    if role_key in ("government_admin", "govt_admin", "admin"):
        token, user = auth_mgr.provision_test_user(
            role=ReviewerRole.GOVERNMENT_ADMIN,
            user_id=f"DEMO_GOVT_{secrets.token_hex(4)}",
            username=f"demo.govt.{secrets.token_hex(2)}",
            full_name="Er. Rajesh Kumar (Demo Admin)",
            organization="Delhi Public Works Department (South Zone)",
            expires_in_seconds=900,
            is_demo=True,
        )
    elif role_key in ("government_engineer", "govt_engineer", "engineer"):
        token, user = auth_mgr.provision_test_user(
            role=ReviewerRole.GOVERNMENT_ENGINEER,
            user_id=f"DEMO_ENG_{secrets.token_hex(4)}",
            username=f"demo.eng.{secrets.token_hex(2)}",
            full_name="Er. Neha Gupta (Demo Field Engineer)",
            organization="Delhi PWD Civil Maintenance Division",
            expires_in_seconds=900,
            is_demo=True,
        )
    elif role_key in ("pro_professional", "pro", "architect", "consultant"):
        token, user = auth_mgr.provision_test_user(
            role=ReviewerRole.PRO_PROFESSIONAL,
            user_id=f"DEMO_PRO_{secrets.token_hex(4)}",
            username=f"demo.pro.{secrets.token_hex(2)}",
            full_name="Ar. Ananya Roy (Demo Pro Architect)",
            organization="Studio Vriksh & Urban Resiliency Partners",
            expires_in_seconds=900,
            is_demo=True,
        )
    elif role_key in ("normal_user", "public_citizen", "public", "citizen", "guest"):
        token, user = auth_mgr.provision_test_user(
            role=ReviewerRole.NORMAL_USER,
            user_id=f"DEMO_CITIZEN_{secrets.token_hex(4)}",
            username=f"demo.citizen.{secrets.token_hex(2)}",
            full_name="Vikram Sharma (Demo Citizen)",
            organization="Civil Society / Citizen Climate Observer",
            expires_in_seconds=900,
            is_demo=True,
        )
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unknown role '{target_role}'. Choose 'government_admin', 'government_engineer', 'pro_professional', or 'public_citizen'.",
        )

    perms = [p.value for p in ROLE_PERMISSIONS.get(user.role, set())]
    return {
        "access_token": token,
        "token": token,
        "token_type": "Bearer",
        "expires_in": 900,
        "role": user.role.value.lower(),
        "user_id": user.user_id,
        "organization": user.organization,
        "permissions": sorted(perms),
        "user": {
            "user_id": user.user_id,
            "username": user.username,
            "full_name": user.full_name,
            "role": user.role.value,
            "organization": user.organization,
            "permissions": sorted(perms),
            "is_demo": True,
            "expires_at": user.expires_at,
        },
        "message": f"Switched to {user.role.value} persona ({user.full_name} / {user.organization}).",
    }
