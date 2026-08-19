"""Phase 5: stock transfer engine tests."""
import pytest
from fastapi import HTTPException

import routes.stock_transfers as st_routes
import routes.db_compat as db_compat_module
from tests.conftest import FakeCollection, FakeDb, make_user


def fake_check_permission(user):
    async def _inner(u, k):
        return None
    return _inner


def _base_db():
    return FakeDb(
        products=FakeCollection([{"id": "P1", "product_name": "Cement"}]),
        depots=FakeCollection([{"id": "D1", "name": "Depot One"}, {"id": "D2", "name": "Depot Two"}]),
        companies=FakeCollection([{"id": "C1", "name": "Company One"}]),
        stock_transfers=FakeCollection(),
        stock_transfer_audit=FakeCollection(),
        approval_matrices=FakeCollection(),
        depot_inventory=FakeCollection([
            {"depot_id": "D1", "product_id": "P1", "available_quantity": 100, "locked_qty": 0},
            {"depot_id": "D2", "product_id": "P1", "available_quantity": 0, "locked_qty": 0},
        ]),
        company_inventory=FakeCollection(),
    )


async def _create_transfer(monkeypatch, qty=10, from_id="D1", to_id="D2", product_id="P1"):
    fake_db = _base_db()
    monkeypatch.setattr(db_compat_module, "db", fake_db)
    monkeypatch.setattr(st_routes, "db", fake_db)
    monkeypatch.setattr(st_routes, "check_permission", fake_check_permission(make_user()))

    from routes.stock_transfers import StockTransferCreate
    data = StockTransferCreate(product_id=product_id, quantity_mt=qty, from_type="Depot", from_id=from_id, to_type="Depot", to_id=to_id)
    tr = await st_routes.create_stock_transfer(data, make_user(id="U1", role="Weightment"))
    return fake_db, tr


async def test_create_locks_source(monkeypatch):
    fake_db, tr = await _create_transfer(monkeypatch, qty=10)
    assert tr["status"] == "Requested"
    assert tr["transfer_no"].startswith("TRF-")
    # locked_qty incremented
    inv = await fake_db.depot_inventory.find_one({"depot_id": "D1", "product_id": "P1"})
    assert inv["locked_qty"] == 10
    # audit
    audits = await fake_db.stock_transfer_audit.find({"transfer_id": tr["id"]}).to_list(100)
    assert len(audits) == 1
    assert audits[0]["event"] == "Requested"


async def test_create_insufficient_stock_fails(monkeypatch):
    fake_db = _base_db()
    # D1 has only 5 available
    fake_db.depot_inventory.rows[0]["available_quantity"] = 5
    monkeypatch.setattr(db_compat_module, "db", fake_db)
    monkeypatch.setattr(st_routes, "db", fake_db)
    monkeypatch.setattr(st_routes, "check_permission", fake_check_permission(make_user()))
    from routes.stock_transfers import StockTransferCreate
    data = StockTransferCreate(product_id="P1", quantity_mt=10, from_type="Depot", from_id="D1", to_type="Depot", to_id="D2")
    with pytest.raises(HTTPException) as exc:
        await st_routes.create_stock_transfer(data, make_user(id="U1"))
    assert exc.value.status_code == 400
    # transfer rolled back
    assert len(fake_db.stock_transfers.rows) == 0


async def test_valid_state_machine(monkeypatch):
    fake_db, tr = await _create_transfer(monkeypatch)
    monkeypatch.setattr(st_routes, "check_permission", fake_check_permission(make_user(id="U2", role="Management")))
    # Requested -> Approved (different user)
    tr = await st_routes.approve_transfer(tr["id"], None, make_user(id="U2", role="Management"))
    assert tr["status"] == "Approved"
    # Approved -> Dispatched
    tr = await st_routes.dispatch_transfer(tr["id"], None, make_user(id="U2", role="Weightment"))
    assert tr["status"] == "Dispatched"
    # Dispatched -> Received (moves stock)
    # mock move to avoid real SQL; patch _move_inventory to update fake collections
    async def fake_move(transfer):
        # decrement D1, increment D2
        src = await fake_db.depot_inventory.find_one({"depot_id": "D1", "product_id": "P1"})
        dst = await fake_db.depot_inventory.find_one({"depot_id": "D2", "product_id": "P1"})
        src["available_quantity"] -= transfer["quantity_mt"]
        src["locked_qty"] -= transfer["quantity_mt"]
        dst["available_quantity"] += transfer["quantity_mt"]
    monkeypatch.setattr(st_routes, "_move_inventory", fake_move)
    # need to patch _unlock_source to not double-unlock (we handle in fake_move)
    async def fake_unlock(transfer):
        pass
    monkeypatch.setattr(st_routes, "_unlock_source", fake_unlock)

    tr = await st_routes.receive_transfer(tr["id"], None, make_user(id="U2"))
    assert tr["status"] == "Received"
    # audit count = 4 (Requested + 3 transitions)
    audits = await fake_db.stock_transfer_audit.find({"transfer_id": tr["id"]}).to_list(100)
    assert len(audits) == 4


async def test_invalid_transition_rejected(monkeypatch):
    fake_db, tr = await _create_transfer(monkeypatch)
    monkeypatch.setattr(st_routes, "check_permission", fake_check_permission(make_user(id="U2", role="Management")))
    with pytest.raises(HTTPException) as exc:
        await st_routes.receive_transfer(tr["id"], None, make_user(id="U2"))
    assert exc.value.status_code == 400


async def test_reject_requires_reason(monkeypatch):
    fake_db, tr = await _create_transfer(monkeypatch)
    monkeypatch.setattr(st_routes, "check_permission", fake_check_permission(make_user(id="U2", role="Management")))
    from routes.stock_transfers import TransitionPayload
    with pytest.raises(HTTPException) as exc:
        await st_routes.reject_transfer(tr["id"], TransitionPayload(notes=None), make_user(id="U2", role="Management"))
    assert exc.value.status_code == 400


async def test_no_self_approve(monkeypatch):
    fake_db, tr = await _create_transfer(monkeypatch)
    monkeypatch.setattr(st_routes, "check_permission", fake_check_permission(make_user(id="U1", role="Management")))
    with pytest.raises(HTTPException) as exc:
        await st_routes.approve_transfer(tr["id"], None, make_user(id="U1", role="Management"))
    assert exc.value.status_code == 400


async def test_approval_matrix_role_gating(monkeypatch):
    fake_db, tr = await _create_transfer(monkeypatch, qty=10)
    fake_db.approval_matrices.rows.append({
        "id": "M1", "entity": "stock_transfer", "product_id": None, "amount_threshold": 5,
        "approver_roles": ["Management"], "active": True
    })
    monkeypatch.setattr(db_compat_module, "db", fake_db)
    monkeypatch.setattr(st_routes, "db", fake_db)
    monkeypatch.setattr(st_routes, "check_permission", fake_check_permission(make_user()))

    # Loader cannot approve large transfer
    with pytest.raises(HTTPException) as exc:
        await st_routes.approve_transfer(tr["id"], None, make_user(id="U2", role="Loader"))
    assert exc.value.status_code == 403
    # Management can
    tr2 = await st_routes.approve_transfer(tr["id"], None, make_user(id="U2", role="Management"))
    assert tr2["status"] == "Approved"


async def test_cancel_unlocks(monkeypatch):
    fake_db, tr = await _create_transfer(monkeypatch, qty=10)
    # D1 locked 10
    assert (await fake_db.depot_inventory.find_one({"depot_id": "D1", "product_id": "P1"}))["locked_qty"] == 10
    monkeypatch.setattr(st_routes, "check_permission", fake_check_permission(make_user(id="U1", role="Weightment")))
    await st_routes.cancel_transfer(tr["id"], None, make_user(id="U1"))
    assert (await fake_db.depot_inventory.find_one({"depot_id": "D1", "product_id": "P1"}))["locked_qty"] == 0


async def test_reject_unlocks(monkeypatch):
    fake_db, tr = await _create_transfer(monkeypatch, qty=10)
    monkeypatch.setattr(st_routes, "check_permission", fake_check_permission(make_user(id="U2", role="Management")))
    await st_routes.reject_transfer(tr["id"], st_routes.TransitionPayload(notes="bad"), make_user(id="U2", role="Management"))
    assert (await fake_db.depot_inventory.find_one({"depot_id": "D1", "product_id": "P1"}))["locked_qty"] == 0


async def test_approval_matrix_product_specific(monkeypatch):
    fake_db = _base_db()
    fake_db.approval_matrices.rows = [
        {"id": "M1", "entity": "stock_transfer", "product_id": "P1", "amount_threshold": None, "approver_roles": ["Management"], "active": True},
        {"id": "M2", "entity": "stock_transfer", "product_id": None, "amount_threshold": None, "approver_roles": ["Admin"], "active": True},
    ]
    fake_db.products.rows.append({"id": "P2", "product_name": "Steel"})
    fake_db.stock_transfers.rows = []
    fake_db.depot_inventory.rows = [
        {"depot_id": "D1", "product_id": "P1", "available_quantity": 100, "locked_qty": 0},
        {"depot_id": "D2", "product_id": "P1", "available_quantity": 0, "locked_qty": 0},
        {"depot_id": "D1", "product_id": "P2", "available_quantity": 100, "locked_qty": 0},
        {"depot_id": "D2", "product_id": "P2", "available_quantity": 0, "locked_qty": 0},
    ]
    monkeypatch.setattr(db_compat_module, "db", fake_db)
    monkeypatch.setattr(st_routes, "db", fake_db)
    monkeypatch.setattr(st_routes, "check_permission", fake_check_permission(make_user()))

    # P1 should require Management, P2 should require Admin (fallback)
    from routes.stock_transfers import StockTransferCreate
    tr1 = await st_routes.create_stock_transfer(StockTransferCreate(product_id="P1", quantity_mt=10, from_type="Depot", from_id="D1", to_type="Depot", to_id="D2"), make_user(id="U1", role="Weightment"))
    with pytest.raises(HTTPException):
        await st_routes.approve_transfer(tr1["id"], None, make_user(id="U2", role="Admin"))
    await st_routes.approve_transfer(tr1["id"], None, make_user(id="U2", role="Management"))

    tr2 = await st_routes.create_stock_transfer(StockTransferCreate(product_id="P2", quantity_mt=10, from_type="Depot", from_id="D1", to_type="Depot", to_id="D2"), make_user(id="U1", role="Weightment"))
    with pytest.raises(HTTPException):
        await st_routes.approve_transfer(tr2["id"], None, make_user(id="U2", role="Management"))
    await st_routes.approve_transfer(tr2["id"], None, make_user(id="U2", role="Admin"))
