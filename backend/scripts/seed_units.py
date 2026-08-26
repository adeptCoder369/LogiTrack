"""
Units seeder — one tenant, one record per entity for step-by-step flow test.

Usage:
  python scripts/seed_units.py --fresh          # wipe units tenant and recreate
  python scripts/seed_units.py --no-fresh       # additive
  python scripts/seed_units.py --password Units@123

Creates tenant `units` (id uuid5 logiTrack.units) with exactly 1 of each:
  region, location, source company, client, depot, product, source_product,
  transporter/truck, user (Management), department/designation/employee,
  lead, firm, delivery_order, purchase_order, inventory, lifting, pickup,
  invoice, payment, approval_matrix, stock_transfer, subscription.

Login: POST /api/v1/auth/login {mobile:"919000000001", password:"Units@123", tenant:"units"}
Then test in order: companies → depots → products → DO → PO → lifting → pickup → invoice → transfer → usage
"""
import argparse, asyncio, sys, uuid
from pathlib import Path
from datetime import datetime, timezone, timedelta

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
try:
    from dotenv import load_dotenv
    load_dotenv(ROOT / ".env")
except Exception:
    pass

import bcrypt
from sqlalchemy import delete, select
from database import AsyncSessionLocal, engine, Base
import models_sqlalchemy as m

SLUG="units"
TID=str(uuid.uuid5(uuid.NAMESPACE_DNS, "logitrack.units"))
TENANT={"slug":SLUG,"name":"Units Test Tenant","id":TID,"branding":{"name":"Units","primary":"210 90% 40%","accent":"24 95% 53%"},"feature_flags":{"invoices":True,"stock_transfers":True,"leads":True,"firms":True},"subscription_plan":"pro"}

def did(*parts): return str(uuid.uuid5(uuid.NAMESPACE_DNS, f"{SLUG}:{':'.join(parts)}"))
def now(): return datetime.now(timezone.utc)
def hp(pw="Units@123"): return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()

# same order as reset_to_master for wipe
WIPE_MODELS = [
    m.UsageLog, m.BillingEvent, m.Subscription,
    m.StockTransferAudit, m.StockTransfer, m.ApprovalMatrix,
    m.InvoiceItem, m.Invoice, m.InvoicePayment, m.Payment, m.CreditNote, m.DebitNote,
    m.Pickup, m.Lifting, m.VerifiedTruck, m.DeliveryOrder, m.PurchaseOrder,
    m.FirmAccess, m.FirmFactory, m.FirmOffice, m.Firm,
    m.Employee, m.Designation, m.Department,
    m.Lead,
    m.ClientFactory, m.ClientOffice, m.ClientModule,
    m.CompanyPricing, m.ProductOverride, m.SourceProduct,
    m.DepotInventory, m.CompanyInventory,
    m.Truck, m.Transporter, m.RailwaySiding, m.RailwayZone,
    m.Depot, m.Location, m.Region,
    m.Product,
    m.CompanyUser, m.Company,
    m.User,
]

async def wipe_units():
    for model in WIPE_MODELS:
        try:
            async with AsyncSessionLocal() as s:
                if hasattr(model,"tenant_id"):
                    await s.execute(delete(model).where(model.tenant_id==TID))
                    await s.commit()
        except Exception:
            pass
    print(f" wiped tenant {SLUG} {TID[:8]}")

async def ensure_tenant():
    async with AsyncSessionLocal() as s:
        t=(await s.execute(select(m.Tenant).where(m.Tenant.slug==SLUG))).scalar_one_or_none()
        if t:
            t.name=TENANT["name"]; t.branding=TENANT["branding"]; t.feature_flags=TENANT["feature_flags"]; t.subscription_plan=TENANT["subscription_plan"]; t.status="active"
            await s.commit(); print(f" tenant {SLUG} updated"); return t
        t=m.Tenant(id=TID, name=TENANT["name"], slug=SLUG, status="active", subscription_plan=TENANT["subscription_plan"], branding=TENANT["branding"], feature_flags=TENANT["feature_flags"], created_at=now())
        s.add(t); await s.commit(); print(f" tenant {SLUG} created {TID[:8]}"); return t

async def seed(password):
    print(f"\n== Seeding units tenant {SLUG} ({TID[:8]}) ==")
    async with AsyncSessionLocal() as s:
        # region/location
        r1=m.Region(id=did("region","north"), tenant_id=TID, name="North Zone", code="NORTH", created_at=now())
        l1=m.Location(id=did("loc","delhi"), tenant_id=TID, region_id=r1.id, name="Delhi NCR", city="Delhi", state="Delhi", created_at=now())
        s.add_all([r1,l1]); await s.commit(); print(" region/location: 1/1")
        # companies
        c_source=m.Company(id=did("company","source"), tenant_id=TID, name="Units Source Co", entity_roles=["Source","Company"], is_client=False, city="Delhi", state="Delhi", created_at=now())
        c_client=m.Company(id=did("company","client"), tenant_id=TID, name="Units Client Ltd", entity_roles=["Client","Company"], is_client=True, company_type="Client", city="Delhi", state="Delhi", created_at=now())
        s.add_all([c_source,c_client]); await s.commit(); print(" companies: 2 (source+client)")
        # depot
        d1=m.Depot(id=did("depot","north"), tenant_id=TID, company_id=c_source.id, location_id=l1.id, name="UNITS Depot North", city="Delhi", state="Delhi", location="Delhi NCR", warehouse_type="Covered", storage_capacity=5000, assigned_roles=["Management","Admin","Weightment","Depot Staff"], created_at=now())
        s.add(d1); await s.commit(); print(" depots: 1")
        # product
        p1=m.Product(id=did("product","cement"), tenant_id=TID, product_name="Cement OPC 53", product_code="CEM-001", category="Cement", hsn_code="2523", unit_of_measurement="MT", assigned_roles=["Management","Admin","Weightment","Depot Staff"], created_at=now())
        s.add(p1); await s.commit(); print(" products: 1")
        # source_product (depot->product + company->product)
        s.add_all([
            m.SourceProduct(id=did("sp","d1-p1"), tenant_id=TID, source_id=d1.id, source_type="Depot", product_id=p1.id, active=True, created_at=now()),
            m.SourceProduct(id=did("sp","c1-p1"), tenant_id=TID, source_id=c_source.id, source_type="Company", product_id=p1.id, active=True, created_at=now()),
        ]); await s.commit(); print(" source_products: 2")
        # overrides/pricing (1 each)
        s.add(m.ProductOverride(id=did("ov","c1-p1"), tenant_id=TID, company_id=c_client.id, product_id=p1.id, code="UNITS-CEM", name="Units Cement", min_stock=10, pricing_model="per_tonne", active=True, created_at=now()))
        s.add(m.CompanyPricing(id=did("pricing","c1-p1"), tenant_id=TID, company_id=c_client.id, product_id=p1.id, tier="standard", rate=5200, currency="INR", valid_from="2024-01-01", valid_to="2026-12-31", created_at=now()))
        await s.commit(); print(" overrides/pricing: 1/1")
        # office/factory
        s.add(m.ClientOffice(id=did("office","ho"), tenant_id=TID, company_id=c_client.id, name="Head Office", office_type="Head Office", is_head_office=True, city="Delhi", state="Delhi", created_at=now()))
        s.add(m.ClientFactory(id=did("factory","p1"), tenant_id=TID, company_id=c_client.id, factory_name="Delhi Grinding Unit", product_id=p1.id, city="Delhi", state="Delhi", created_at=now()))
        await s.commit(); print(" offices/factories: 1/1")
        # dept/desig
        dept=m.Department(id=did("dept","ops"), tenant_id=TID, name="Operations", description="Ops", created_at=now())
        desig=m.Designation(id=did("desig","manager"), tenant_id=TID, name="Manager", department_id=dept.id, created_at=now())
        s.add_all([dept,desig]); await s.commit(); print(" departments/designations: 1/1")
        # transporter/truck
        tr1=m.Transporter(id=did("transporter","1"), tenant_id=TID, name="Units Trans Co", contact_person_name="Suresh", mobile_number="9876500001", address="Delhi", created_at=now())
        s.add(tr1); await s.commit()
        truck=m.Truck(id=did("truck","1"), tenant_id=TID, vehicle_number="MH12AB0001", transporter_id=tr1.id, transporter_name=tr1.name, capacity_mt=25, tare_weight_mt=12, driver_name="Driver 1", driver_mobile="9000000011", helper_name="Helper 1", drivers=[{"name":"Driver 1","mobile":"9000000011","is_primary":True}], current_status="Idle", created_at=now())
        s.add(truck); await s.commit(); print(" transporters/trucks: 1/1")
        # railway minimal
        rz=m.RailwayZone(id=did("rz","1"), tenant_id=TID, country="India", railway_zone="North Central", zone_code="NCR", headquarters="Prayagraj", created_at=now())
        rs=m.RailwaySiding(id=did("rs","1"), tenant_id=TID, siding_name="Units Siding A", siding_code="SDA", location="Delhi", station_name="Delhi Jn", state="Delhi", created_at=now())
        s.add_all([rz,rs]); await s.commit()
        # user Management (the one you will test step-by-step)
        hashed=hp(password)
        u=m.User(id=did("user","1"), tenant_id=TID, name="Aarav Sharma (units)", mobile="919000000001", country_code="91", password=hashed, role="Management", company_id=c_client.id, depot_id=d1.id, email="management.units@demo.test", otp_verified=True, password_set=True, is_master_admin=False, assigned_products=[], assigned_depots=[], created_at=now())
        s.add(u); await s.commit(); print(" users: 1 Management (919000000001)")
        # employee linked
        emp=m.Employee(id=did("emp","1"), tenant_id=TID, employee_type="Internal", employee_id="EMP-UNITS-001", name="Emp One units", mobile="9000000011", email="emp1.units@demo.test", company_id=c_client.id, department_id=dept.id, designation_id=desig.id, leads_scope="All", login_enabled=True, user_id=u.id, city="Delhi", state="Delhi", created_at=now())
        s.add(emp); u.employee_id=emp.id; await s.commit(); print(" employees: 1 linked to Management")
        # client_modules
        for mod in ["invoices","stock_transfers","leads","reports"]:
            s.add(m.ClientModule(id=did("mod",c_client.id,mod), tenant_id=TID, company_id=c_client.id, module=mod, enabled=True, created_at=now()))
        await s.commit(); print(" client_modules: 4")
        # lead (1)
        lead=m.Lead(id=did("lead","1"), tenant_id=TID, lead_type="Sales", company_id=c_source.id, company_name="Lead Co 1 units", status="New", contact_person="Contact 1", contact_mobile="9876500001", notes="Units lead 1", created_by=u.id, created_at=now())
        s.add(lead); await s.commit(); print(" leads: 1")
        # firm (1)
        f1=m.Firm(id=did("firm","1"), tenant_id=TID, name="UNITS Firm One", company_id=c_client.id, city="Delhi", state="Delhi", created_at=now())
        s.add(f1); await s.commit()
        s.add(m.FirmOffice(id=did("firm_off","1"), tenant_id=TID, firm_id=f1.id, name="Firm One HO", office_type="Head Office", is_head_office=True, city="Delhi", state="Delhi", created_at=now()))
        s.add(m.FirmFactory(id=did("firm_fac","1"), tenant_id=TID, firm_id=f1.id, factory_name="Firm One Factory", product_id=p1.id, city="Delhi", state="Delhi", created_at=now()))
        await s.commit()
        s.add(m.FirmAccess(id=did("fa","1"), tenant_id=TID, firm_id=f1.id, user_id=u.id, product_id=p1.id, depot_id=d1.id, created_at=now()))
        await s.commit(); print(" firms: 1 + 1 office + 1 factory + 1 firm_access")
        # delivery_order (1)
        do1=m.DeliveryOrder(id=did("do","1"), tenant_id=TID, from_company_id=c_source.id, from_company_name=c_source.name, product_id=p1.id, product_name=p1.product_name, product_code=p1.product_code, total_quantity_mt=100, destination_type="Depot", to_depot_id=d1.id, to_depot_name=d1.name, do_order_no="DO-UNITS-000001", do_date=now(), lifted_quantity_mt=0, remaining_quantity_mt=100, status="Open", added_by=u.id, added_by_name=u.name, created_at=now())
        s.add(do1); await s.commit(); print(" delivery_orders: 1")
        # purchase_order (1)
        po1=m.PurchaseOrder(id=did("po","1"), tenant_id=TID, source_id=d1.id, source_name=d1.name, source_type="Depot", depot_id=d1.id, depot_name=d1.name, to_company_id=c_client.id, to_company_name=c_client.name, billing_company_id=c_client.id, billing_company_name=c_client.name, product_id=p1.id, product_name=p1.product_name, product_code=p1.product_code, total_quantity_mt=100, dispatched_quantity_mt=0, remaining_quantity_mt=100, status="Open", po_number="PO-UNITS-000001", po_date=now(), added_by=u.id, added_by_name=u.name, created_at=now())
        s.add(po1); await s.commit(); print(" purchase_orders: 1")
        # inventory (1 each)
        s.add(m.DepotInventory(id=did("inv","d1-p1"), tenant_id=TID, depot_id=d1.id, depot_name=d1.name, company_id=c_source.id, product_id=p1.id, product_name=p1.product_name, product_code=p1.product_code, total_received=0, total_dispatched=0, available_quantity=0, locked_qty=0, last_updated=now()))
        s.add(m.CompanyInventory(id=did("inv","c1-p1"), tenant_id=TID, company_id=c_client.id, company_name=c_client.name, product_id=p1.id, product_name=p1.product_name, product_code=p1.product_code, total_received=0, total_dispatched=0, available_quantity=0, last_updated=now()))
        await s.commit(); print(" inventory: 1 depot + 1 company")
        # lifting (1 Primary)
        lifting=m.Lifting(id=did("lifting","1"), tenant_id=TID, lifting_type="Primary", transport_mode="Road", company_id=c_source.id, delivery_order_id=do1.id, product_id=p1.id, product_name=p1.product_name, quantity_mt=25, loading_point_type="Company", loading_point_id=c_source.id, loading_point_name=c_source.name, vehicle_id=truck.id, vehicle_number=truck.vehicle_number, transporter_name=tr1.name, driver_name="Driver 1", driver_mobile="9000000011", lifting_no="LFT-UNITS-000001", loading_status="Loaded", unloading_status="Pending", created_at=now())
        s.add(lifting); await s.commit(); print(" liftings: 1")
        # pickup (1)
        s.add(m.Pickup(id=did("pickup","1"), tenant_id=TID, date=now().strftime("%Y-%m-%d"), truck_number=truck.vehicle_number, truck_id=truck.id, transporter_id=tr1.id, transporter_name=tr1.name, company_id=c_client.id, company_name=c_client.name, source_id=d1.id, source_name=d1.name, source_type="Depot", product_id=p1.id, product_name=p1.product_name, status="scheduled", estimated_weight_mt=25, driver_phone="9000000011", purchase_order_id=po1.id, purchase_order_no=po1.po_number, created_at=now()))
        await s.commit(); print(" pickups: 1")
        # verified_truck (1)
        s.add(m.VerifiedTruck(id=did("vt","1"), tenant_id=TID, date=now().strftime("%Y-%m-%d"), truck_no=truck.vehicle_number, transporter=tr1.name, driver_mobile="9000000011", company=c_client.name, product=p1.product_name, product_id=p1.id, po_number=po1.po_number, weight=24.5, verified_by=u.id, created_at=now()))
        await s.commit(); print(" verified_trucks: 1")
        # invoice (1 Draft)
        inv=m.Invoice(id=did("invoice","1"), tenant_id=TID, invoice_no="INV-UNITS-000001", po_id=po1.id, po_number=po1.po_number, client_company_id=c_client.id, client_company_name=c_client.name, billing_company_id=c_client.id, billing_company_name=c_client.name, source_type="Depot", source_id=d1.id, source_name=d1.name, status="Draft", invoice_date=now().strftime("%Y-%m-%d"), due_date=(now()+timedelta(days=30)).strftime("%Y-%m-%d"), subtotal=10000, gst_rate=18, gst_amount=1800, total_amount=11800, currency="INR", created_by=u.id, created_at=now())
        s.add(inv)
        s.add(m.InvoiceItem(id=did("invitem","1"), tenant_id=TID, invoice_id=inv.id, product_id=p1.id, product_name=p1.product_name, quantity_mt=20, rate=500, amount=10000, created_at=now()))
        await s.commit(); print(" invoices: 1")
        # payment (1)
        pay=m.Payment(id=did("pay","1"), tenant_id=TID, receipt_no="RCPT-UNITS-000001", company_id=c_client.id, company_name=c_client.name, amount=11800, mode="UPI", bank_ref="UPI001", payment_date=now().strftime("%Y-%m-%d"), created_by=u.id, created_at=now())
        s.add(pay); await s.commit(); print(" payments: 1")
        # approval_matrix + transfer (1 Requested)
        s.add(m.ApprovalMatrix(id=did("am","1"), tenant_id=TID, entity="stock_transfer", amount_threshold=100, approver_roles=["Management","Admin"], active=True, created_at=now()))
        await s.commit()
        tr=m.StockTransfer(id=did("tr","1"), tenant_id=TID, transfer_no="TRF-UNITS-000001", product_id=p1.id, product_name=p1.product_name, quantity_mt=10, from_type="Depot", from_id=d1.id, from_name=d1.name, to_type="Depot", to_id=d1.id, to_name=d1.name, status="Requested", requested_by=u.id, requested_by_name=u.name, requested_at=now(), created_at=now())
        s.add(tr)
        s.add(m.StockTransferAudit(id=did("audit","1","Requested"), tenant_id=TID, transfer_id=tr.id, event="Requested", actor_id=u.id, actor_name=u.name, payload="{}", created_at=now()))
        await s.commit(); print(" stock_transfers: 1 Requested + audit")
        # subscription
        s.add(m.Subscription(id=did("sub","1"), tenant_id=TID, plan="pro", status="active", provider="stripe", provider_subscription_id=f"sub_stripe_{TID}_pro", current_period_start=now(), current_period_end=now()+timedelta(days=30), created_at=now()))
        s.add(m.BillingEvent(id=did("be","1"), tenant_id=TID, provider="stripe", event_type="customer.subscription.updated", payload='{"type":"customer.subscription.updated"}', created_at=now()))
        await s.commit(); print(" subscriptions/billing: 1/1")

    print("\n" + "="*70)
    print("UNITS TENANT — ONE RECORD PER ENTITY (step-by-step)")
    print("="*70)
    print(f" Tenant: units ({TID[:8]})  Login: 919000000001 / {password} tenant=units")
    print(" Flow to test in order:")
    print("  1. GET /companies (2) -> create new Client")
    print("  2. GET /depots (1) -> GET /sources?type=Depot (2)")
    print("  3. GET /products (1) -> GET /locations/tree")
    print("  4. GET /delivery-orders (1) -> POST new DO")
    print("  5. GET /purchase-orders (1) -> POST new PO")
    print("  6. POST /liftings (verify Primary) -> GET /depot-inventory")
    print("  7. GET /pickups (1) -> verify/reject")
    print("  8. GET /invoices (1) -> generate from PO -> issue -> payments/credit-notes")
    print("  9. GET /stock-transfers (1) -> approve/dispatch/receive")
    print(" 10. GET /usage/summary + /billing/subscriptions")
    print("="*70)

async def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--fresh", action="store_true", default=True, help="wipe units first (default)")
    ap.add_argument("--no-fresh", dest="fresh", action="store_false")
    ap.add_argument("--password", default="Units@123")
    args=ap.parse_args()
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        print(" tables ensured")
    except Exception as e:
        print(f" create_all warn: {e}")
    if args.fresh:
        print(f"Wiping {SLUG}..."); await wipe_units()
        async with AsyncSessionLocal() as s:
            if not (await s.execute(select(m.Tenant).where(m.Tenant.slug==SLUG))).scalar_one_or_none():
                await ensure_tenant()
    else:
        await ensure_tenant()
    await seed(args.password)

if __name__=="__main__":
    asyncio.run(main())
