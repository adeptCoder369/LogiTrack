"""
Demo seeder — creates two isolated demo tenants with full end-to-end data.

Usage:
    python scripts/seed_demo.py --fresh            # wipe demo+acme and recreate (default)
    python scripts/seed_demo.py --tenant demo      # only demo tenant
    python scripts/seed_demo.py --password Demo@123

Two tenants: demo (Demo Logistics) and acme (Acme Traders), both password Demo@123
for every user. Same mobiles across tenants demonstrate tenant slug disambiguation.

Inventory is seeded via atomic liftings helper where possible, else direct inventory rows
for speed. All writes are tenant-scoped and deterministic (uuid5) so re-runs are stable.

Run from backend/:  python scripts/seed_demo.py --fresh
"""
import argparse
import asyncio
import sys
import uuid
from pathlib import Path
from datetime import datetime, timezone, timedelta

# -- bootstrap --
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
# load .env if present
try:
    from dotenv import load_dotenv
    load_dotenv(ROOT / ".env")
except Exception:
    pass

import bcrypt
from sqlalchemy import delete, select

from database import AsyncSessionLocal
import models_sqlalchemy as m

DEMO_TENANTS = [
    {
        "slug": "demo",
        "name": "Demo Logistics",
        "id": str(uuid.uuid5(uuid.NAMESPACE_DNS, "logitrack.demo")),
        "branding": {"name": "Demo Logistics", "primary": "222 47% 11%", "accent": "24 95% 53%"},
        "feature_flags": {"invoices": True, "stock_transfers": True, "leads": True, "firms": True},
        "subscription_plan": "pro",
    },
    {
        "slug": "acme",
        "name": "Acme Traders",
        "id": str(uuid.uuid5(uuid.NAMESPACE_DNS, "logitrack.acme")),
        "branding": {"name": "Acme Traders", "primary": "210 90% 40%", "accent": "142 70% 45%"},
        "feature_flags": {"invoices": True, "stock_transfers": True, "leads": True, "firms": True},
        "subscription_plan": "pro",
    },
]

ROLES = [
    ("Management", "Aarav Sharma"),
    ("Admin", "Priya Patel"),
    ("Loader", "Rahul Verma"),
    ("Weightment", "Sunita Rao"),
    ("Depot Staff", "Amit Kumar"),
    ("Depot Supervisor", "Neha Singh"),
    ("Transporter", "Vikram Yadav"),
    ("Dispatch Verifier", "Anjali Mehta"),
]

def did(tenant_slug, *parts):
    return str(uuid.uuid5(uuid.NAMESPACE_DNS, f"{tenant_slug}:{':'.join(parts)}"))

def now():
    return datetime.now(timezone.utc)

def hp(pw="Demo@123"):
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()

# deletion order (children first)
TENANT_TABLES = [
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

async def wipe_tenant(tenant_id):
    async with AsyncSessionLocal() as s:
        for model in TENANT_TABLES:
            if not hasattr(model, "tenant_id"):
                continue
            await s.execute(delete(model).where(model.tenant_id == tenant_id))
        await s.commit()
    print(f"  wiped tenant {tenant_id[:8]}")

async def ensure_tenant(t):
    async with AsyncSessionLocal() as s:
        exists = (await s.execute(select(m.Tenant).where(m.Tenant.slug == t["slug"]))).scalar_one_or_none()
        if exists:
            # update branding/flags
            exists.branding = t["branding"]
            exists.feature_flags = t["feature_flags"]
            exists.subscription_plan = t["subscription_plan"]
            await s.commit()
            print(f"  tenant {t['slug']} exists -> updated")
            return exists
        row = m.Tenant(id=t["id"], name=t["name"], slug=t["slug"], status="active",
                       subscription_plan=t["subscription_plan"], branding=t["branding"],
                       feature_flags=t["feature_flags"], created_at=now())
        s.add(row)
        await s.commit()
        print(f"  tenant {t['slug']} created {t['id'][:8]}")
        return row

async def seed_one_tenant(t, password):
    tid = t["id"]
    slug = t["slug"]
    print(f"\n== Seeding tenant {slug} ({tid[:8]}) ==")

    # -- Regions -> Locations -> Companies -> Depots -> Products
    async with AsyncSessionLocal() as s:
        # regions
        r1 = m.Region(id=did(slug,"region","north"), tenant_id=tid, name="North Zone", code="NORTH", created_at=now())
        r2 = m.Region(id=did(slug,"region","west"), tenant_id=tid, name="West Zone", code="WEST", created_at=now())
        s.add_all([r1,r2])
        # locations
        l1 = m.Location(id=did(slug,"loc","delhi"), tenant_id=tid, region_id=r1.id, name="Delhi NCR", city="Delhi", state="Delhi", created_at=now())
        l2 = m.Location(id=did(slug,"loc","jaipur"), tenant_id=tid, region_id=r1.id, name="Jaipur", city="Jaipur", state="Rajasthan", created_at=now())
        l3 = m.Location(id=did(slug,"loc","mumbai"), tenant_id=tid, region_id=r2.id, name="Mumbai", city="Mumbai", state="Maharashtra", created_at=now())
        s.add_all([l1,l2,l3])
        await s.commit()
        print(f"  regions/locations: 2/3")

        # companies: Source, Parent Client, 2 Child Clients
        c_source = m.Company(id=did(slug,"company","source"), tenant_id=tid, name=f"{t['name']} Source Co", entity_roles=["Source","Company"], is_client=False, city="Delhi", state="Delhi", created_at=now())
        c_parent = m.Company(id=did(slug,"company","parent"), tenant_id=tid, name=f"{t['name']} Parent Ltd", entity_roles=["Client","Company"], is_client=True, company_type="Client", city="Delhi", state="Delhi", created_at=now())
        c_child1 = m.Company(id=did(slug,"company","child1"), tenant_id=tid, name=f"{t['name']} Client A", entity_roles=["Client"], is_client=True, parent_client_id=c_parent.id, city="Jaipur", state="Rajasthan", created_at=now())
        c_child2 = m.Company(id=did(slug,"company","child2"), tenant_id=tid, name=f"{t['name']} Client B", entity_roles=["Client"], is_client=True, parent_client_id=c_parent.id, city="Mumbai", state="Maharashtra", created_at=now())
        s.add_all([c_source, c_parent, c_child1, c_child2])
        await s.commit()
        print(f"  companies: 4 (source, parent, 2 children)")

        # depots
        d1 = m.Depot(id=did(slug,"depot","north"), tenant_id=tid, company_id=c_source.id, location_id=l1.id, name=f"{slug.upper()} Depot North", city="Delhi", state="Delhi", location="Delhi NCR", warehouse_type="Covered", storage_capacity=5000, assigned_roles=["Weightment","Depot Staff"], created_at=now())
        d2 = m.Depot(id=did(slug,"depot","west"), tenant_id=tid, company_id=c_source.id, location_id=l3.id, name=f"{slug.upper()} Depot West", city="Mumbai", state="Maharashtra", location="Mumbai", warehouse_type="Open Yard", storage_capacity=3000, assigned_roles=["Weightment"], created_at=now())
        d3 = m.Depot(id=did(slug,"depot","jaipur"), tenant_id=tid, company_id=c_child1.id, location_id=l2.id, name=f"{slug.upper()} Depot Jaipur", city="Jaipur", state="Rajasthan", location="Jaipur", warehouse_type="Covered", storage_capacity=2000, assigned_roles=[], created_at=now())
        s.add_all([d1,d2,d3])
        await s.commit()
        print(f"  depots: 3")

        # products
        p1 = m.Product(id=did(slug,"product","cement"), tenant_id=tid, product_name="Cement OPC 53", product_code="CEM-001", category="Cement", hsn_code="2523", unit_of_measurement="MT", assigned_roles=["Weightment","Depot Staff"], created_at=now())
        p2 = m.Product(id=did(slug,"product","steel"), tenant_id=tid, product_name="Steel TMT 500D", product_code="STL-001", category="Steel", hsn_code="7214", assigned_roles=["Weightment"], created_at=now())
        p3 = m.Product(id=did(slug,"product","aggregate"), tenant_id=tid, product_name="Aggregate 20mm", product_code="AGG-001", category="Aggregates", hsn_code="2517", assigned_roles=[], created_at=now())
        s.add_all([p1,p2,p3])
        await s.commit()
        print(f"  products: 3")

        # source_products: Depot North -> Cement & Steel, Depot West -> Aggregate, Source Co -> Cement
        sp = [
            m.SourceProduct(id=did(slug,"sp","d1-p1"), tenant_id=tid, source_id=d1.id, source_type="Depot", product_id=p1.id, active=True, created_at=now()),
            m.SourceProduct(id=did(slug,"sp","d1-p2"), tenant_id=tid, source_id=d1.id, source_type="Depot", product_id=p2.id, active=True, created_at=now()),
            m.SourceProduct(id=did(slug,"sp","d2-p3"), tenant_id=tid, source_id=d2.id, source_type="Depot", product_id=p3.id, active=True, created_at=now()),
            m.SourceProduct(id=did(slug,"sp","c1-p1"), tenant_id=tid, source_id=c_source.id, source_type="Company", product_id=p1.id, active=True, created_at=now()),
        ]
        s.add_all(sp)
        await s.commit()
        print(f"  source_products: 4 (tests '2 products 1 permission')")

        # product_overrides + company_pricing
        ov = m.ProductOverride(id=did(slug,"ov","c1-p1"), tenant_id=tid, company_id=c_child1.id, product_id=p1.id, code="ACME-CEM", name="Acme Cement Premium", min_stock=20, pricing_model="per_tonne", active=True, created_at=now())
        s.add(ov)
        pr1 = m.CompanyPricing(id=did(slug,"pricing","c1-p1"), tenant_id=tid, company_id=c_child1.id, product_id=p1.id, tier="standard", rate=5200, currency="INR", valid_from="2024-01-01", valid_to="2026-12-31", created_at=now())
        pr2 = m.CompanyPricing(id=did(slug,"pricing","c1-p2"), tenant_id=tid, company_id=c_child1.id, product_id=p2.id, tier="standard", rate=48500, currency="INR", valid_from="2024-01-01", valid_to=None, created_at=now())
        pr3 = m.CompanyPricing(id=did(slug,"pricing","c2-p1"), tenant_id=tid, company_id=c_child2.id, product_id=p1.id, tier="bulk", rate=5100, currency="INR", valid_from="2024-06-01", valid_to=None, created_at=now())
        s.add_all([pr1,pr2,pr3])
        await s.commit()
        print(f"  overrides/pricing: 1/3")

        # offices/factories per child
        off1 = m.ClientOffice(id=did(slug,"office","c1-ho"), tenant_id=tid, company_id=c_child1.id, name="Head Office Jaipur", office_type="Head Office", is_head_office=True, city="Jaipur", state="Rajasthan", contact_person="Ramesh", contact_mobile="9876543210", created_at=now())
        off2 = m.ClientOffice(id=did(slug,"office","c1-br"), tenant_id=tid, company_id=c_child1.id, name="Branch Delhi", office_type="Branch", city="Delhi", state="Delhi", created_at=now())
        s.add_all([off1,off2])
        fac1 = m.ClientFactory(id=did(slug,"factory","c1-p1"), tenant_id=tid, company_id=c_child1.id, factory_name="Jaipur Grinding Unit", product_id=p1.id, city="Jaipur", state="Rajasthan", created_at=now())
        s.add(fac1)
        await s.commit()
        print(f"  offices/factories: 2/1")

        # departments/designations
        dep_ops = m.Department(id=did(slug,"dept","ops"), tenant_id=tid, name="Operations", description="Field ops", created_at=now())
        dep_sales = m.Department(id=did(slug,"dept","sales"), tenant_id=tid, name="Sales", description="Sales", created_at=now())
        dep_acct = m.Department(id=did(slug,"dept","accounts"), tenant_id=tid, name="Accounts", description="Finance", created_at=now())
        s.add_all([dep_ops, dep_sales, dep_acct])
        await s.commit()
        des_mgr = m.Designation(id=did(slug,"desig","manager"), tenant_id=tid, name="Manager", department_id=dep_ops.id, created_at=now())
        des_exec = m.Designation(id=did(slug,"desig","executive"), tenant_id=tid, name="Executive", department_id=dep_sales.id, created_at=now())
        des_weigh = m.Designation(id=did(slug,"desig","weigher"), tenant_id=tid, name="Weighbridge Operator", department_id=dep_ops.id, created_at=now())
        des_acc = m.Designation(id=did(slug,"desig","accountant"), tenant_id=tid, name="Accountant", department_id=dep_acct.id, created_at=now())
        s.add_all([des_mgr, des_exec, des_weigh, des_acc])
        await s.commit()
        print(f"  departments/designations: 3/4")

        # transporters + trucks
        tr1 = m.Transporter(id=did(slug,"transporter","1"), tenant_id=tid, name=f"{slug.upper()} Trans Co", contact_person_name="Suresh", mobile_number="9876500001", address="Delhi", created_at=now())
        tr2 = m.Transporter(id=did(slug,"transporter","2"), tenant_id=tid, name=f"{slug.upper()} Logistics", contact_person_name="Mahesh", mobile_number="9876500002", address="Mumbai", created_at=now())
        s.add_all([tr1,tr2])
        await s.commit()
        trucks = []
        for i in range(1,6):
            vid = did(slug,"truck",str(i))
            tr = tr1 if i<=3 else tr2
            trucks.append(m.Truck(id=vid, tenant_id=tid, vehicle_number=f"MH12AB{i:04d}", transporter_id=tr.id, transporter_name=tr.name, capacity_mt=25, tare_weight_mt=12, driver_name=f"Driver {i}", driver_mobile=f"900000001{i}", helper_name=f"Helper {i}", drivers=[{"name":f"Driver {i}","mobile":f"900000001{i}","is_primary":True}], current_status="Idle", created_at=now()))
        s.add_all(trucks)
        await s.commit()
        print(f"  transporters/trucks: 2/5")

        # railway
        rz = m.RailwayZone(id=did(slug,"rz","1"), tenant_id=tid, country="India", railway_zone="North Central", zone_code="NCR", headquarters="Prayagraj", created_at=now())
        s.add(rz)
        rs1 = m.RailwaySiding(id=did(slug,"rs","1"), tenant_id=tid, siding_name=f"{slug.upper()} Siding A", siding_code="SDA", location="Delhi", station_name="Delhi Jn", state="Delhi", created_at=now())
        rs2 = m.RailwaySiding(id=did(slug,"rs","2"), tenant_id=tid, siding_name=f"{slug.upper()} Siding B", siding_code="SDB", location="Mumbai", station_name="Mumbai CST", state="Maharashtra", created_at=now())
        s.add_all([rs1,rs2])
        await s.commit()

        # users (8 roles)
        hashed = hp(password)
        users = {}
        # keep map of product/depot ids for assignments
        for idx, (role, name) in enumerate(ROLES, start=1):
            uid = did(slug,"user",str(idx))
            mobile = f"91{9000000000+idx}"  # 919000000001 etc - same across tenants shows isolation
            # Weightment gets assigned product/depot; Transporter gets transporter_id
            assigned_products = []
            assigned_depots = []
            company_id = c_child1.id if role not in ("Transporter",) else None
            depot_id = d1.id if role in ("Weightment","Depot Staff","Depot Supervisor") else None
            transporter_id = tr1.id if role=="Transporter" else None
            if role == "Weightment":
                assigned_products = [p1.id]
                assigned_depots = [d1.id]
            elif role == "Depot Staff":
                assigned_products = [p1.id, p2.id]
                assigned_depots = [d1.id, d2.id]
            u = m.User(id=uid, tenant_id=tid, name=f"{name} ({slug})", mobile=mobile, country_code="91", password=hashed, role=role, company_id=company_id, depot_id=depot_id, transporter_id=transporter_id, transporter_name=tr1.name if transporter_id else None, email=f"{role.lower().replace(' ','')}.{slug}@demo.test", otp_verified=True, password_set=True, is_master_admin=False, assigned_products=assigned_products, assigned_depots=assigned_depots, excluded_products=[], excluded_depots=[], created_at=now())
            s.add(u)
            users[role] = u
        await s.commit()
        print(f"  users: {len(users)} (Management..Dispatch Verifier)")

        # employees (6: 4 Internal, 2 External)
        emps = []
        for i, etype in enumerate(["Internal","Internal","Internal","Internal","External","External"], start=1):
            eid = did(slug,"emp",str(i))
            dept = [dep_ops.id, dep_sales.id, dep_ops.id, dep_acct.id, dep_ops.id, dep_sales.id][i-1]
            desig = [des_mgr.id, des_exec.id, des_weigh.id, des_acc.id, des_weigh.id, des_exec.id][i-1]
            emps.append(m.Employee(id=eid, tenant_id=tid, employee_type=etype, employee_id=f"EMP-{slug.upper()}-{i:03d}", name=f"Emp {i} {slug}", mobile=f"900000002{i}", email=f"emp{i}.{slug}@demo.test", company_id=c_child1.id, department_id=dept, designation_id=desig, leads_scope=["All","Sales","Purchase","All","All","All"][i-1], login_enabled=False, user_id=None, city="Delhi", state="Delhi", created_at=now()))
        s.add_all(emps)
        await s.commit()
        # link first Internal employee to Weightment user
        w_user = users["Weightment"]
        e1 = emps[0]
        w_user.employee_id = e1.id
        e1.user_id = w_user.id
        e1.login_enabled = True
        await s.commit()
        print(f"  employees: 6 (4 Internal, 2 External) + 1 linked")

        # client_modules per child
        for mod in ["invoices","stock_transfers","leads","reports"]:
            s.add(m.ClientModule(id=did(slug,"mod",c_child1.id,mod), tenant_id=tid, company_id=c_child1.id, module=mod, enabled=True, created_at=now()))
        for mod in ["invoices","reports"]:
            s.add(m.ClientModule(id=did(slug,"mod",c_child2.id,mod), tenant_id=tid, company_id=c_child2.id, module=mod, enabled=True, created_at=now()))
        await s.commit()
        print(f"  client_modules: 6")

        # leads (5)
        leads = []
        for i, (lt, st) in enumerate([("Sales","New"),("Sales","Contacted"),("Purchase","Qualified"),("Sales","Converted"),("Purchase","Lost")], start=1):
            lid = did(slug,"lead",str(i))
            assigned_emp = emps[1].id if i==2 else (emps[0].id if i==4 else None)
            leads.append(m.Lead(id=lid, tenant_id=tid, lead_type=lt, company_id=c_source.id, company_name=f"Lead Co {i} {slug}", status=st, parent_client_id=c_parent.id if i==4 else None, assigned_employee_id=assigned_emp, assigned_employee_name=emps[1].name if assigned_emp else None, contact_person=f"Contact {i}", contact_mobile=f"98765000{i:02d}", notes=f"Demo lead {i}", created_by=users["Management"].id, created_at=now()))
        s.add_all(leads)
        await s.commit()
        # converted lead -> create client already via company Child? For demo convert, just simulate: one lead marked Converted already has converted_company_id = c_child2.id? Actually keep as is; demo conversion flow will create NEW client on click, so leave converted lead as example but set converted_company_id
        leads[3].converted_company_id = c_child2.id
        leads[3].converted_at = now()
        await s.commit()
        print(f"  leads: 5 (incl 1 Converted)")

        # firms + offices/factories/access
        f1 = m.Firm(id=did(slug,"firm","1"), tenant_id=tid, name=f"{slug.upper()} Firm One", company_id=c_child1.id, city="Delhi", state="Delhi", created_at=now())
        f2 = m.Firm(id=did(slug,"firm","2"), tenant_id=tid, name=f"{slug.upper()} Firm Two", parent_firm_id=f1.id, company_id=c_child2.id, city="Mumbai", state="Maharashtra", created_at=now())
        s.add_all([f1,f2])
        await s.commit()
        s.add(m.FirmOffice(id=did(slug,"firm_off","1"), tenant_id=tid, firm_id=f1.id, name="Firm One HO", office_type="Head Office", is_head_office=True, city="Delhi", state="Delhi", created_at=now()))
        s.add(m.FirmOffice(id=did(slug,"firm_off","2"), tenant_id=tid, firm_id=f1.id, name="Branch Jaipur", office_type="Branch", city="Jaipur", state="Rajasthan", created_at=now()))
        await s.commit()
        s.add(m.FirmFactory(id=did(slug,"firm_fac","1"), tenant_id=tid, firm_id=f1.id, factory_name="Firm One Factory", product_id=p1.id, city="Delhi", state="Delhi", created_at=now()))
        await s.commit()
        # firm_access: Weightment user gets 1 product x 2 depots on F1 (the "5x3 ->1x2" demo)
        s.add(m.FirmAccess(id=did(slug,"fa","1"), tenant_id=tid, firm_id=f1.id, user_id=users["Weightment"].id, product_id=p1.id, depot_id=d1.id, created_at=now()))
        s.add(m.FirmAccess(id=did(slug,"fa","2"), tenant_id=tid, firm_id=f1.id, user_id=users["Weightment"].id, product_id=p1.id, depot_id=d2.id, created_at=now()))
        await s.commit()
        print(f"  firms: 2 + offices 2 + factories 1 + firm_access 2 (Weightment)")

        # delivery_orders (3)
        do1 = m.DeliveryOrder(id=did(slug,"do","1"), tenant_id=tid, from_company_id=c_source.id, from_company_name=c_source.name, product_id=p1.id, product_name=p1.product_name, product_code=p1.product_code, total_quantity_mt=300, destination_type="Depot", to_depot_id=d1.id, to_depot_name=d1.name, do_order_no=f"DO-{slug.upper()}-000001", do_date=now(), lifted_quantity_mt=75, remaining_quantity_mt=225, status="In Progress", added_by=users["Management"].id, added_by_name=users["Management"].name, created_at=now())
        do2 = m.DeliveryOrder(id=did(slug,"do","2"), tenant_id=tid, from_company_id=c_source.id, from_company_name=c_source.name, product_id=p2.id, product_name=p2.product_name, total_quantity_mt=150, destination_type="Company", to_company_id=c_child1.id, to_company_name=c_child1.name, do_order_no=f"DO-{slug.upper()}-000002", do_date=now(), lifted_quantity_mt=0, remaining_quantity_mt=150, status="Open", added_by=users["Management"].id, added_by_name=users["Management"].name, created_at=now())
        do3 = m.DeliveryOrder(id=did(slug,"do","3"), tenant_id=tid, from_company_id=c_source.id, from_company_name=c_source.name, product_id=p1.id, product_name=p1.product_name, total_quantity_mt=200, destination_type="Depot", to_depot_id=d2.id, to_depot_name=d2.name, loading_siding_id=rs1.id if 'rs1' in locals() else None, loading_siding_name=rs1.siding_name if 'rs1' in locals() else None, destination_siding_id=rs2.id if 'rs2' in locals() else None, destination_siding_name=rs2.siding_name if 'rs2' in locals() else None, do_order_no=f"DO-{slug.upper()}-000003", do_date=now(), lifted_quantity_mt=0, remaining_quantity_mt=200, status="Open", added_by=users["Management"].id, added_by_name=users["Management"].name, created_at=now())
        s.add_all([do1,do2,do3])
        await s.commit()
        print(f"  delivery_orders: 3")

        # purchase_orders (3: Open, In Progress, Completed)
        po1 = m.PurchaseOrder(id=did(slug,"po","1"), tenant_id=tid, source_id=d1.id, source_name=d1.name, source_type="Depot", depot_id=d1.id, depot_name=d1.name, to_company_id=c_child1.id, to_company_name=c_child1.name, billing_company_id=c_parent.id, billing_company_name=c_parent.name, product_id=p1.id, product_name=p1.product_name, product_code=p1.product_code, total_quantity_mt=200, dispatched_quantity_mt=0, remaining_quantity_mt=200, status="Open", po_number=f"PO-{slug.upper()}-000001", po_date=now(), added_by=users["Management"].id, added_by_name=users["Management"].name, created_at=now())
        po2 = m.PurchaseOrder(id=did(slug,"po","2"), tenant_id=tid, source_id=d1.id, source_name=d1.name, source_type="Depot", depot_id=d1.id, depot_name=d1.name, to_company_id=c_child1.id, to_company_name=c_child1.name, billing_company_id=c_child1.id, billing_company_name=c_child1.name, product_id=p2.id, product_name=p2.product_name, product_code=p2.product_code, total_quantity_mt=150, dispatched_quantity_mt=40, remaining_quantity_mt=110, status="In Progress", po_number=f"PO-{slug.upper()}-000002", po_date=now(), added_by=users["Management"].id, added_by_name=users["Management"].name, created_at=now())
        po3 = m.PurchaseOrder(id=did(slug,"po","3"), tenant_id=tid, source_id=d2.id, source_name=d2.name, source_type="Depot", depot_id=d2.id, depot_name=d2.name, to_company_id=c_child2.id, to_company_name=c_child2.name, billing_company_id=c_child2.id, billing_company_name=c_child2.name, product_id=p1.id, product_name=p1.product_name, product_code=p1.product_code, total_quantity_mt=80, dispatched_quantity_mt=80, remaining_quantity_mt=0, status="Completed", po_number=f"PO-{slug.upper()}-000003", po_date=now(), added_by=users["Management"].id, added_by_name=users["Management"].name, created_at=now())
        s.add_all([po1,po2,po3])
        await s.commit()
        print(f"  purchase_orders: 3")

        # depot/company inventory (direct, realistic balances)
        s.add(m.DepotInventory(id=did(slug,"inv","d1-p1"), tenant_id=tid, depot_id=d1.id, depot_name=d1.name, company_id=c_source.id, product_id=p1.id, product_name=p1.product_name, product_code=p1.product_code, total_received=120, total_dispatched=25, available_quantity=95, locked_qty=0, last_updated=now()))
        s.add(m.DepotInventory(id=did(slug,"inv","d1-p2"), tenant_id=tid, depot_id=d1.id, depot_name=d1.name, company_id=c_source.id, product_id=p2.id, product_name=p2.product_name, product_code=p2.product_code, total_received=80, total_dispatched=10, available_quantity=70, locked_qty=5, last_updated=now()))
        s.add(m.DepotInventory(id=did(slug,"inv","d2-p3"), tenant_id=tid, depot_id=d2.id, depot_name=d2.name, company_id=c_source.id, product_id=p3.id, product_name=p3.product_name, product_code=p3.product_code, total_received=50, total_dispatched=5, available_quantity=45, locked_qty=0, last_updated=now()))
        s.add(m.CompanyInventory(id=did(slug,"inv","c1-p1"), tenant_id=tid, company_id=c_child1.id, company_name=c_child1.name, product_id=p1.id, product_name=p1.product_name, product_code=p1.product_code, total_received=40, total_dispatched=0, available_quantity=40, last_updated=now()))
        await s.commit()
        print(f"  inventory: 4 rows")

        # liftings (6: Primary Pending/Verified/Rejected + Secondary)
        liftings = []
        for i, (lt, us) in enumerate([("Primary","Pending"),("Primary","Verified"),("Primary","Rejected"),("Primary","Verified"),("Secondary","Verified"),("Secondary","Pending")], start=1):
            lid = did(slug,"lifting",str(i))
            liftings.append(m.Lifting(id=lid, tenant_id=tid, lifting_type=lt, transport_mode="Road", company_id=c_source.id if lt=="Primary" else c_child1.id, delivery_order_id=do1.id if lt=="Primary" else None, purchase_order_id=po2.id if lt=="Secondary" and i==5 else None, product_id=p1.id if i%2==1 else p2.id, product_name=p1.product_name if i%2==1 else p2.product_name, quantity_mt=25 if i<=3 else 15, loading_point_type="Company" if lt=="Primary" else "Depot", loading_point_id=c_source.id if lt=="Primary" else d1.id, loading_point_name=c_source.name if lt=="Primary" else d1.name, vehicle_id=trucks[i-1].id, vehicle_number=trucks[i-1].vehicle_number, transporter_name=tr1.name, driver_name=f"Driver {i}", driver_mobile=f"900000001{i}", lifting_no=f"LFT-{slug.upper()}-{i:06d}", loading_status="Loaded", unloading_status=us, created_at=now()))
        s.add_all(liftings)
        await s.commit()
        print(f"  liftings: 6")

        # pickups (8: all statuses)
        statuses = ["scheduled","loading_started","loaded","weightment_done","verified","final_verified","rescheduled","rejected"]
        for i, st in enumerate(statuses, start=1):
            pid = did(slug,"pickup",str(i))
            s.add(m.Pickup(id=pid, tenant_id=tid, date=(now()-timedelta(days=i%3)).strftime("%Y-%m-%d"), truck_number=trucks[(i-1)%5].vehicle_number, truck_id=trucks[(i-1)%5].id, transporter_id=tr1.id, transporter_name=tr1.name, company_id=c_child1.id, company_name=c_child1.name, source_id=d1.id, source_name=d1.name, source_type="Depot", product_id=p1.id, product_name=p1.product_name, status=st, estimated_weight_mt=25, driver_phone=f"900000002{i}", purchase_order_id=po1.id if i%2==1 else po2.id, purchase_order_no=po1.po_number if i%2==1 else po2.po_number, weight_mt=24.5 if st in ("verified","final_verified") else None, loaded_weight_mt=24.8 if st in ("weightment_done","final_verified","verified") else None, created_at=now()))
        await s.commit()
        print(f"  pickups: 8")

        # verified_trucks (3)
        for i in range(1,4):
            s.add(m.VerifiedTruck(id=did(slug,"vt",str(i)), tenant_id=tid, date=now().strftime("%Y-%m-%d"), truck_no=trucks[i-1].vehicle_number, transporter=tr1.name, driver_mobile=f"900000001{i}", company=c_child1.name, product=p1.product_name, product_id=p1.id, po_number=po1.po_number, weight=24.5, verified_by=users["Weightment"].id, created_at=now()))
        await s.commit()
        print(f"  verified_trucks: 3")

        # invoices (3: Draft/Issued/Paid) + items
        for i, (st, total) in enumerate([("Draft", 10400),("Issued", 23600),("Paid", 23600)], start=1):
            inv_id = did(slug,"invoice",str(i))
            s.add(m.Invoice(id=inv_id, tenant_id=tid, invoice_no=f"INV-{slug.upper()}-{i:06d}", po_id=po1.id if i==1 else po2.id, po_number=po1.po_number if i==1 else po2.po_number, client_company_id=c_child1.id, client_company_name=c_child1.name, billing_company_id=c_parent.id if i==3 else c_child1.id, billing_company_name=c_parent.name if i==3 else c_child1.name, source_type="Depot", source_id=d1.id, source_name=d1.name, status=st, invoice_date=now().strftime("%Y-%m-%d"), due_date=(now()+timedelta(days=30)).strftime("%Y-%m-%d"), subtotal=20000 if i>1 else 10000, gst_rate=18, gst_amount=3600 if i>1 else 1800, total_amount=total, currency="INR", created_by=users["Management"].id, created_at=now()))
            s.add(m.InvoiceItem(id=did(slug,"invitem",str(i)), tenant_id=tid, invoice_id=inv_id, product_id=p1.id if i%2==1 else p2.id, product_name=p1.product_name if i%2==1 else p2.product_name, quantity_mt=40 if i==1 else 25, rate=500 if i==1 else 800, amount=20000 if i>1 else 10000, created_at=now()))
        await s.commit()
        print(f"  invoices: 3")

        # payments + allocations (for Paid invoice)
        pay1 = m.Payment(id=did(slug,"pay","1"), tenant_id=tid, receipt_no=f"RCPT-{slug.upper()}-000001", company_id=c_child1.id, company_name=c_child1.name, amount=23600, mode="Bank Transfer", bank_ref="UTR123456", payment_date=now().strftime("%Y-%m-%d"), created_by=users["Management"].id, created_at=now())
        pay2 = m.Payment(id=did(slug,"pay","2"), tenant_id=tid, receipt_no=f"RCPT-{slug.upper()}-000002", company_id=c_child1.id, company_name=c_child1.name, amount=5000, mode="UPI", bank_ref="UPI789", payment_date=now().strftime("%Y-%m-%d"), created_by=users["Management"].id, created_at=now())
        s.add_all([pay1,pay2])
        await s.commit()
        # allocate pay1 fully to Paid invoice (3rd)
        paid_inv_id = did(slug,"invoice","3")
        s.add(m.InvoicePayment(id=did(slug,"invpay","1"), tenant_id=tid, invoice_id=paid_inv_id, payment_id=pay1.id, amount_allocated=23600, created_at=now()))
        # partial allocate to Issued invoice (2nd)
        issued_inv_id = did(slug,"invoice","2")
        s.add(m.InvoicePayment(id=did(slug,"invpay","2"), tenant_id=tid, invoice_id=issued_inv_id, payment_id=pay2.id, amount_allocated=5000, created_at=now()))
        await s.commit()
        # credit note reduces Issued outstanding
        s.add(m.CreditNote(id=did(slug,"cn","1"), tenant_id=tid, note_no=f"CN-{slug.upper()}-000001", invoice_id=issued_inv_id, company_id=c_child1.id, company_name=c_child1.name, amount=1000, reason="Quality rebate", applied=True, created_by=users["Management"].id, created_at=now()))
        s.add(m.DebitNote(id=did(slug,"dn","1"), tenant_id=tid, note_no=f"DN-{slug.upper()}-000001", invoice_id=issued_inv_id, company_id=c_child1.id, company_name=c_child1.name, amount=500, reason="Handling surcharge", applied=True, created_by=users["Management"].id, created_at=now()))
        await s.commit()
        print(f"  payments/notes: 2 payments + 2 allocations + 1 credit + 1 debit")

        # approval_matrices
        s.add(m.ApprovalMatrix(id=did(slug,"am","1"), tenant_id=tid, entity="stock_transfer", product_id=None, amount_threshold=100, approver_roles=["Management","Admin"], active=True, created_at=now()))
        s.add(m.ApprovalMatrix(id=did(slug,"am","2"), tenant_id=tid, entity="stock_transfer", product_id=p1.id, amount_threshold=None, approver_roles=["Management"], active=True, created_at=now()))
        await s.commit()
        print(f"  approval_matrices: 2")

        # stock_transfers (4 statuses)
        for i, st in enumerate(["Requested","Approved","Dispatched","Received"], start=1):
            tr = m.StockTransfer(id=did(slug,"tr","transfer",str(i)), tenant_id=tid, transfer_no=f"TRF-{slug.upper()}-{i:06d}", product_id=p1.id, product_name=p1.product_name, quantity_mt=10+i*5, from_type="Depot", from_id=d1.id, from_name=d1.name, to_type="Depot", to_id=d2.id, to_name=d2.name, status=st, requested_by=users["Weightment"].id, requested_by_name=users["Weightment"].name, requested_at=now(), created_at=now())
            if st in ("Approved","Dispatched","Received"):
                tr.approved_by = users["Management"].id; tr.approved_by_name = users["Management"].name; tr.approved_at = now()
            if st in ("Dispatched","Received"):
                tr.dispatched_by = users["Weightment"].id; tr.dispatched_by_name = users["Weightment"].name; tr.dispatched_at = now()
            if st == "Received":
                tr.received_by = users["Management"].id; tr.received_by_name = users["Management"].name; tr.received_at = now()
            s.add(tr)
            # audit rows per transition
            for ev in ["Requested","Approved","Dispatched","Received"][: ["Requested","Approved","Dispatched","Received"].index(st)+1]:
                s.add(m.StockTransferAudit(id=did(slug,"audit",str(i),ev), tenant_id=tid, transfer_id=tr.id, event=ev, actor_id=users["Weightment"].id if ev=="Requested" else users["Management"].id, actor_name=users["Weightment"].name if ev=="Requested" else users["Management"].name, payload="{}", created_at=now()))
        await s.commit()
        print(f"  stock_transfers: 4 + audit")

        # subscriptions / billing_events
        s.add(m.Subscription(id=did(slug,"sub","1"), tenant_id=tid, plan="pro", status="active", provider="stripe", provider_subscription_id=f"sub_stripe_{tid}_pro", current_period_start=now(), current_period_end=now()+timedelta(days=30), created_at=now()))
        s.add(m.BillingEvent(id=did(slug,"be","1"), tenant_id=tid, provider="stripe", event_type="customer.subscription.updated", payload='{"type":"customer.subscription.updated"}', created_at=now()))
        await s.commit()
        print(f"  subscriptions/billing_events: 1/1")

        return {
            "tenant": t, "users": users, "companies": [c_source, c_parent, c_child1, c_child2],
            "depots": [d1,d2,d3], "products": [p1,p2,p3],
        }

async def main():
    parser = argparse.ArgumentParser(description="Seed demo data for two tenants")
    parser.add_argument("--fresh", action="store_true", default=True, help="wipe demo tenants first (default)")
    parser.add_argument("--no-fresh", dest="fresh", action="store_false", help="additive, don't wipe")
    parser.add_argument("--tenant", choices=["demo","acme","all"], default="all", help="which tenant(s) to seed")
    parser.add_argument("--password", default="Demo@123", help="password for all demo users")
    args = parser.parse_args()

    global password
    password = args.password

    targets = DEMO_TENANTS if args.tenant=="all" else [t for t in DEMO_TENANTS if t["slug"]==args.tenant]

    for t in targets:
        if args.fresh:
            print(f"\nWiping {t['slug']}...")
            await wipe_tenant(t["id"])
            # re-ensure tenant row (wipe removed users but tenant row? tenants table has no tenant_id, so wipe didn't touch it; but fresh wants recreate)
            async with AsyncSessionLocal() as s:
                exists = (await s.execute(select(m.Tenant).where(m.Tenant.slug==t["slug"]))).scalar_one_or_none()
                if not exists:
                    await ensure_tenant(t)
                else:
                    # ensure not suspended
                    exists.status = "active"
                    await s.commit()
        else:
            await ensure_tenant(t)

    results = []
    for t in targets:
        r = await seed_one_tenant(t, password)
        results.append(r)

    # credentials table
    print("\n" + "="*70)
    print("DEMO CREDENTIALS (all tenants share mobiles, use tenant slug to disambiguate)")
    print("="*70)
    print(f"{'Tenant':<8} {'Role':<18} {'Mobile':<14} {'Password':<12} {'Name'}")
    print("-"*70)
    for r in results:
        for role, user in r["users"].items():
            print(f"{r['tenant']['slug']:<8} {role:<18} {user.mobile:<14} {password:<12} {user.name}")
    print("-"*70)
    print("Login: POST /api/v1/auth/login  {mobile, password, country_code='91', tenant='demo'|'acme'}")
    print("Master admin (platform) still works with original MASTER_ADMIN_* creds")
    print("="*70)

if __name__ == "__main__":
    asyncio.run(main())
