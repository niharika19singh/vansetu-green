"""
VanSetu GreenTech — Authentication, User Profile & Role-Based Access Control Router.

Provides:
- GET /api/auth/me: Returns current user, verified role, permissions, and municipal organization.
- GET /api/auth/permissions: Lists current user permissions.
- POST /api/auth/demo-switch-role: Development/demonstration persona switching tool.
"""
from __future__ import annotations

import logging
from typing import Any, Dict, List
from fastapi import APIRouter, Depends, HTTPException, status
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
    role: str = Field(description="Role to preview: 'government_admin', 'pro_professional', or 'normal_user'")


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
async def demo_switch_role(req: DemoRoleSwitchRequest) -> Dict[str, Any]:
    """
    Development-only persona provisioning tool for demonstration testing.
    Issues an accredited ephemeral bearer token for the chosen role without granting production privileges.
    """
    auth_mgr = get_auth_manager()
    role_key = req.role.strip().lower()

    if role_key in ("government_admin", "govt_admin", "government_engineer", "admin"):
        token, user = auth_mgr.provision_test_user(
            role=ReviewerRole.GOVERNMENT_ADMIN,
            user_id="PWD_CHIEF_ENG_001",
            username="rajesh.kumar",
            full_name="Er. Rajesh Kumar",
            organization="Delhi Public Works Department (South Zone)",
        )
    elif role_key in ("pro_professional", "pro", "architect", "consultant"):
        token, user = auth_mgr.provision_test_user(
            role=ReviewerRole.PRO_PROFESSIONAL,
            user_id="PRO_USER_VRIKSH_01",
            username="ananya.roy",
            full_name="Ar. Ananya Roy",
            organization="Studio Vriksh & Urban Resiliency Partners",
        )
    elif role_key in ("normal_user", "public", "citizen"):
        token, user = auth_mgr.provision_test_user(
            role=ReviewerRole.NORMAL_USER,
            user_id="CITIZEN_DELHI_04",
            username="vikram.sharma",
            full_name="Vikram Sharma",
            organization="Civil Society / Citizen Climate Observer",
        )
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unknown role '{req.role}'. Choose 'government_admin', 'pro_professional', or 'normal_user'.",
        )

    perms = [p.value for p in ROLE_PERMISSIONS.get(user.role, set())]
    return {
        "access_token": token,
        "token_type": "Bearer",
        "user": {
            "user_id": user.user_id,
            "username": user.username,
            "full_name": user.full_name,
            "role": user.role.value,
            "organization": user.organization,
            "permissions": sorted(perms),
        },
        "message": f"Switched to {user.role.value} persona ({user.full_name} / {user.organization}).",
    }
