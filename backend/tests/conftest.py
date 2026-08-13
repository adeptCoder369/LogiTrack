"""Shared fixtures for the Phase 0 tenant tests.

All tests in this suite are DB-free: they exercise the pure tenant logic
(scope, filter construction, stamping, gating) and monkeypatch the session
factory where a query shape needs verifying.
"""
import os
import sys
from pathlib import Path

# database.py / config.py / server.py read these at import time. The test
# suite never touches a real DB, so safe placeholders keep the imports
# green even when backend/.env is absent.
os.environ.setdefault("MYSQL_URL", "mysql+aiomysql://test:test@localhost/testdb")
os.environ.setdefault("JWT_SECRET", "test-secret")

import pytest

BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

from types import SimpleNamespace


class FakeResult:
    def __init__(self, items=None):
        self._items = items or []
        self.rowcount = 0

    def scalars(self):
        return self

    def all(self):
        return self._items

    def first(self):
        return self._items[0] if self._items else None

    def scalar_one_or_none(self):
        return self._items[0] if self._items else None

    def scalar_one(self):
        return self._items[0] if self._items else None


class FakeSession:
    """Minimal async session double: captures executed statements/added rows."""

    def __init__(self, items=None):
        self.items = items or []
        self.added = []
        self.executed = []

    async def __aenter__(self):
        return self

    async def __aexit__(self, *exc):
        return False

    async def execute(self, stmt):
        self.executed.append(stmt)
        return FakeResult(self.items)

    def add(self, obj):
        self.added.append(obj)

    async def commit(self):
        pass

    async def refresh(self, obj):
        pass


@pytest.fixture(autouse=True)
def reset_tenant_context():
    """Each test starts with an unset tenant context."""
    import tenant as tenant_mod
    tenant_mod.set_tenant_scope({"is_master_admin": True, "tenant_id": None})
    tenant_mod._tenant_flags_var.set(None)
    yield
    tenant_mod.set_tenant_scope({"is_master_admin": True, "tenant_id": None})
    tenant_mod._tenant_flags_var.set(None)


def make_user(**overrides):
    base = {
        "id": "u1",
        "tenant_id": "T1",
        "name": "Test User",
        "mobile": "919999999999",
        "role": "Admin",
        "is_master_admin": False,
    }
    base.update(overrides)
    return SimpleNamespace(**base)
