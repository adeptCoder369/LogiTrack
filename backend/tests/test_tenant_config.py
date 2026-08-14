"""Phase 0: tenant config endpoint + master-admin gating tests."""
from types import SimpleNamespace

import pytest
from fastapi import HTTPException

import tenant as tenant_mod
from tenant import get_tenant_config, ensure_tenant_active
from routes.tenants import _require_master_admin
import server


# ---------- config shape ----------

async def test_get_tenant_config_shape(monkeypatch):
    fake_tenant = SimpleNamespace(
        id="T1", name="Acme", slug="acme", status="active",
        subscription_plan="pro", branding={"name": "Acme"},
        feature_flags={"invoices": True},
    )

    async def fake_load(tenant_id):
        return fake_tenant

    monkeypatch.setattr(tenant_mod, "_load_tenant_row", fake_load)
    config = await get_tenant_config({"tenant_id": "T1"})
    assert config["tenant"] == {
        "id": "T1", "name": "Acme", "slug": "acme", "status": "active",
        "subscription_plan": "pro",
    }
    assert config["branding"] == {"name": "Acme"}
    assert config["feature_flags"] == {"invoices": True}


async def test_get_tenant_config_missing_tenant(monkeypatch):
    async def fake_load(tenant_id):
        return None

    monkeypatch.setattr(tenant_mod, "_load_tenant_row", fake_load)
    with pytest.raises(HTTPException) as exc:
        await get_tenant_config({"tenant_id": "missing"})
    assert exc.value.status_code == 404


# ---------- suspended tenant enforcement ----------

async def test_suspended_tenant_rejected(monkeypatch):
    async def fake_load(tenant_id):
        return SimpleNamespace(id="T1", status="suspended", feature_flags={})

    monkeypatch.setattr(tenant_mod, "_load_tenant_row", fake_load)
    with pytest.raises(HTTPException) as exc:
        await ensure_tenant_active({"tenant_id": "T1", "is_master_admin": False})
    assert exc.value.status_code == 403
    assert "suspended" in exc.value.detail.lower()


async def test_active_tenant_passes(monkeypatch):
    async def fake_load(tenant_id):
        return SimpleNamespace(id="T1", status="active", feature_flags={"x": True})

    monkeypatch.setattr(tenant_mod, "_load_tenant_row", fake_load)
    await ensure_tenant_active({"tenant_id": "T1", "is_master_admin": False})


async def test_master_admin_exempt_from_tenant_check(monkeypatch):
    called = False

    async def fake_load(tenant_id):
        nonlocal called
        called = True
        return None

    monkeypatch.setattr(tenant_mod, "_load_tenant_row", fake_load)
    await ensure_tenant_active({"tenant_id": "T1", "is_master_admin": True})
    assert not called


# ---------- tenant CRUD gating ----------

def test_tenant_crud_requires_master_admin():
    _require_master_admin({"is_master_admin": True, "role": "Management"})  # ok


@pytest.mark.parametrize("user", [
    {"is_master_admin": False, "role": "Management"},   # Management bypasses permissions but not this
    {"is_master_admin": False, "role": "Admin"},
    {"is_master_admin": None, "role": "Admin"},
])
def test_tenant_crud_403_for_non_master(user):
    with pytest.raises(HTTPException) as exc:
        _require_master_admin(user)
    assert exc.value.status_code == 403


# ---------- login disambiguation ----------

async def test_find_user_by_mobile_single_result(monkeypatch):
    from tests.conftest import make_user, FakeSession

    monkeypatch.setattr(server, "AsyncSessionLocal", lambda: FakeSession([make_user()]))
    user = await server._find_user_by_mobile("9999999999", "91")
    assert user["tenant_id"] == "T1"


async def test_find_user_by_mobile_ambiguous_requires_tenant(monkeypatch):
    from tests.conftest import make_user, FakeSession

    monkeypatch.setattr(
        server, "AsyncSessionLocal",
        lambda: FakeSession([make_user(id="a", tenant_id="T1"), make_user(id="b", tenant_id="T2")]),
    )
    with pytest.raises(HTTPException) as exc:
        await server._find_user_by_mobile("9999999999", "91")
    assert exc.value.status_code == 401
    assert "tenant" in exc.value.detail.lower()


async def test_find_user_by_mobile_tenant_scope_resolves(monkeypatch):
    from tests.conftest import make_user, FakeSession

    monkeypatch.setattr(
        server, "AsyncSessionLocal",
        lambda: FakeSession([make_user(id="a", tenant_id="T1"), make_user(id="b", tenant_id="T2")]),
    )
    user = await server._find_user_by_mobile("9999999999", "91", tenant_id="T2")
    assert user["id"] == "b"


async def test_find_user_by_mobile_no_match_returns_none(monkeypatch):
    from tests.conftest import FakeSession

    monkeypatch.setattr(server, "AsyncSessionLocal", lambda: FakeSession([]))
    user = await server._find_user_by_mobile("9999999999", "91")
    assert user is None


# ---------- token claim ----------

def test_create_token_carries_tenant_claim():
    token = server.create_token({"id": "u1", "mobile": "9191", "role": "Admin", "name": "N", "tenant_id": "T1"})
    payload = jwt_decode(token)
    assert payload.get("tenant_id") == "T1"


def test_auth_utils_create_token_carries_tenant_claim():
    import auth_utils
    token = auth_utils.create_token({"id": "u1", "mobile": "9191", "role": "Admin", "name": "N", "tenant_id": "T2"})
    payload = jwt_decode(token)
    assert payload.get("tenant_id") == "T2"


def jwt_decode(token):
    from config import JWT_SECRET, JWT_ALGORITHM
    import jwt
    return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
