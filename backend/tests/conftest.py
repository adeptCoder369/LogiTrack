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


# ---------- fake db_compat collections (Phase 1 tests) ----------

class FakeCursor:
    def __init__(self, items=None):
        self.items = items or []

    def sort(self, key, direction=1):
        # db_compat cursors are chainable; order is not asserted in tests.
        return self

    async def to_list(self, n=None):
        return self.items


class FakeCollection:
    """In-memory stand-in for a db_compat collection proxy.

    Honors plain equality keys and the common {"active": {"$ne": False}}
    pattern; records the filters it receives so tests can assert them.
    """

    def __init__(self, rows=None, rowcount=0):
        self.rows = list(rows or [])
        self.calls = []
        self.rowcount = rowcount

    def _filter(self, filter_dict):
        rows = self.rows
        or_branches = (filter_dict or {}).get("$or")
        if or_branches:
            def _matches(r, branch):
                for k, v in branch.items():
                    if isinstance(v, dict) and list(v.keys()) == ["$in"]:
                        if r.get(k) not in v["$in"]:
                            return False
                    elif isinstance(v, dict):
                        continue
                    elif r.get(k) != v:
                        return False
                return True

            rows = [r for r in rows if any(_matches(r, b) for b in or_branches)]
        for k, v in (filter_dict or {}).items():
            if k == "$or":
                continue
            if isinstance(v, dict) and list(v.keys()) == ["$ne"]:
                rows = [r for r in rows if r.get(k) != v["$ne"]]
            elif isinstance(v, dict) and list(v.keys()) == ["$nin"]:
                rows = [r for r in rows if r.get(k) not in v["$nin"]]
            elif isinstance(v, dict) and list(v.keys()) == ["$in"]:
                rows = [r for r in rows if r.get(k) in v["$in"]]
            elif isinstance(v, dict):
                continue
            else:
                rows = [r for r in rows if r.get(k) == v]
        return rows

    def find(self, filter_dict=None, projection=None):
        # db_compat.find() is synchronous (returns a cursor); only to_list
        # is awaited.
        self.calls.append(("find", filter_dict, projection))
        return FakeCursor(self._filter(filter_dict))

    async def find_one(self, filter_dict=None, projection=None):
        self.calls.append(("find_one", filter_dict, projection))
        rows = self._filter(filter_dict or {})
        return rows[0] if rows else None

    async def count_documents(self, filter_dict=None):
        return len(self._filter(filter_dict or {}))

    async def insert_one(self, doc):
        self.rows.append(dict(doc))
        return {"acknowledged": True, "inserted_id": doc.get("id")}

    async def update_one(self, filter_dict, update_dict, upsert=False):
        self.calls.append(("update_one", filter_dict, update_dict))
        matched = self._filter(filter_dict or {})
        for row in matched:
            for k, v in (update_dict or {}).get("$set", {}).items():
                row[k] = v
            for k, v in (update_dict or {}).get("$inc", {}).items():
                row[k] = float(row.get(k, 0) or 0) + float(v)
        self.rowcount = 1 if matched else 0
        return SimpleNamespace(matched_count=len(matched), modified_count=len(matched))

    async def delete_one(self, filter_dict):
        self.calls.append(("delete_one", filter_dict))
        matched = self._filter(filter_dict or {})
        if matched:
            self.rows.remove(matched[0])
            self.rowcount = 1
            return SimpleNamespace(deleted_count=1)
        self.rowcount = 0
        return SimpleNamespace(deleted_count=0)

    async def delete_many(self, filter_dict):
        self.calls.append(("delete_many", filter_dict))
        matched = self._filter(filter_dict or {})
        for r in list(matched):
            self.rows.remove(r)
        return SimpleNamespace(deleted_count=len(matched))


class FakeDb:
    """Stand-in for the db_compat proxy with named collections."""

    def __init__(self, **collections):
        self._collections = collections

    def __getattr__(self, name):
        if name in self._collections:
            return self._collections[name]
        raise AttributeError(f"No fake collection: {name}")


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
    return base
