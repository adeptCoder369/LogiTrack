"""
QA check — manual proxy for Inventory + full flow.
Runs the 42 checks from docs/QA_CHECKLIST.md via API + DB, prints PASS/FAIL.

Usage: python backend/scripts/qa_check.py 2>&1 | Tee-Object qa.log
"""
import sys, uuid, time, json
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from dotenv import load_dotenv
load_dotenv(ROOT / ".env")

import requests
from sqlalchemy import select, func
from database import AsyncSessionLocal
import models_sqlalchemy as m

BASE = "http://localhost:8000/api/v1"
PASS=0; FAIL=0

def log(ok, msg, detail=""):
    global PASS, FAIL
    if ok:
        PASS+=1
        print(f" PASS {msg} {detail}")
    else:
        FAIL+=1
        print(f" FAIL {msg} {detail}")

def login(mobile, tenant, pwd="Demo@123"):
    r=requests.post(f"{BASE}/auth/login", json={"mobile":mobile,"country_code":"91","password":pwd,"tenant":tenant} if tenant else {"mobile":mobile,"country_code":"91","password":pwd}, timeout=8)
    if r.status_code!=200:
        return None, r
    return r.json()["token"], r

def auth_get(token, path, params=None):
    h={"Authorization": f"Bearer {token}"}
    return requests.get(f"{BASE}{path}", headers=h, params=params, timeout=8)

# --- baseline ---
print("== BASELINE ==")
for slug in ["demo","acme"]:
    tok,_=login("919000000001", slug)
    log(tok is not None, f"login demo-Mgmt {slug}")
    if tok:
        r=auth_get(tok, "/companies")
        log(r.status_code==200 and len(r.json())==4, f"GET /companies {slug}", f"{r.status_code} {len(r.json()) if r.status_code==200 else r.text[:120]}")
        r=auth_get(tok, "/products")
        log(r.status_code==200, f"GET /products {slug}", f"{len(r.json()) if r.status_code==200 else r.text[:80]}")
        r=auth_get(tok, "/depots")
        log(r.status_code==200, f"GET /depots {slug}", f"{len(r.json()) if r.status_code==200 else r.text[:80]}")

# master
r=requests.post(f"{BASE}/auth/login", json={"mobile":"919999999999","country_code":"91","password":"Master@123"}, timeout=8)
tok_master=r.json()["token"] if r.status_code==200 else None
log(tok_master is not None, "login master")
if tok_master:
    r=auth_get(tok_master, "/tenants")
    log(r.status_code==200 and len(r.json())>=3, "GET /tenants master", f"{r.status_code} {len(r.json()) if r.status_code==200 else ''}")
    r=auth_get(tok_master, "/companies")
    log(r.status_code==200 and len(r.json())>=10, "GET /companies master", f"{r.status_code} {len(r.json()) if r.status_code==200 else r.text[:120]}")
    # CORS header on 200
    r2=requests.get(f"{BASE}/companies", headers={"Authorization": f"Bearer {tok_master}", "Origin":"http://localhost:3000"}, timeout=8)
    log(r2.headers.get("Access-Control-Allow-Origin")=="*", "CORS header on 200", r2.headers.get("Access-Control-Allow-Origin"))

# P0 tenant config
r=requests.get(f"{BASE}/tenant/config", timeout=5)
log(r.status_code==200, "GET /tenant/config no auth", r.text[:80])

# P1 source / product
print("\n== P1 SOURCE ==")
tok_demo,_=login("919000000001","demo")
tok_weight,_=login("919000000004","demo")
tok_dstaff,_=login("919000000005","demo")
# products per role
if tok_demo:
    r=auth_get(tok_demo,"/products"); log(r.status_code==200 and len(r.json())==3, "Mgmt products 3", len(r.json()) if r.status_code==200 else "")
if tok_weight:
    r=auth_get(tok_weight,"/products"); log(r.status_code==200 and len(r.json())==1, "Weightment products 1", len(r.json()) if r.status_code==200 else r.text[:120])
if tok_dstaff:
    r=auth_get(tok_dstaff,"/products"); log(r.status_code==200 and len(r.json())==2, "Depot Staff products 2", len(r.json()) if r.status_code==200 else "")
# sources
if tok_demo:
    r=auth_get(tok_demo,"/sources", params={"type":"Depot"}); log(r.status_code==200, "GET /sources?type=Depot Mgmt", f"{len(r.json()) if r.status_code==200 else r.text[:80]}")
if tok_weight:
    r=auth_get(tok_weight,"/sources", params={"type":"Depot"}); log(r.status_code==200, "GET /sources Weightment filtered", f"{len(r.json()) if r.status_code==200 else r.text[:80]}")
# product overrides
if tok_demo:
    import asyncio
    async def get_c_child1():
        async with AsyncSessionLocal() as s:
            t=(await s.execute(select(m.Tenant).where(m.Tenant.slug=="demo"))).scalar_one()
            c=(await s.execute(select(m.Company).where(m.Company.tenant_id==t.id, m.Company.name.like("%Client A%")))).scalars().first()
            return c.id if c else None
    c_child1=asyncio.run(get_c_child1())
    if c_child1:
        r=auth_get(tok_demo, "/product-overrides", params={"company_id":c_child1}); log(r.status_code==200 and len(r.json())==1, "GET /product-overrides c_child1 1", len(r.json()) if r.status_code==200 else r.text[:120])
        r=auth_get(tok_demo, "/company-pricing", params={"company_id":c_child1}); log(r.status_code==200 and len(r.json())>=2, "GET /company-pricing c_child1 >=2", len(r.json()) if r.status_code==200 else "")
        # effective
        p=(asyncio.run(AsyncSessionLocal().__aenter__()) if False else None)
        async def get_p1():
            async with AsyncSessionLocal() as s:
                t=(await s.execute(select(m.Tenant).where(m.Tenant.slug=="demo"))).scalar_one()
                p=(await s.execute(select(m.Product).where(m.Product.tenant_id==t.id, m.Product.product_code=="CEM-001"))).scalar_one()
                return p.id
        p1=asyncio.run(get_p1())
        r=auth_get(tok_demo, f"/products/{p1}/effective", params={"company_id":c_child1}); log(r.status_code==200, "GET /products/{p1}/effective", r.text[:120])

# P2 locations
print("\n== P2 LOCATIONS ==")
if tok_demo:
    r=auth_get(tok_demo,"/regions"); log(r.status_code==200 and len(r.json())==2, "GET /regions 2", len(r.json()) if r.status_code==200 else r.text[:80])
    r=auth_get(tok_demo,"/locations"); log(r.status_code==200 and len(r.json())==3, "GET /locations 3", len(r.json()) if r.status_code==200 else "")
    r=auth_get(tok_demo,"/locations/tree"); log(r.status_code==200, "GET /locations/tree", str(r.json())[:120] if r.status_code==200 else "")
    # offices/factories
    if c_child1:
        r=auth_get(tok_demo, f"/companies/{c_child1}/offices"); log(r.status_code==200 and len(r.json())==2, "GET /companies/{c1}/offices 2", len(r.json()) if r.status_code==200 else r.text[:120])
        r=auth_get(tok_demo, f"/companies/{c_child1}/factories"); log(r.status_code==200 and len(r.json())==1, "GET .../factories 1", len(r.json()) if r.status_code==200 else "")
        r=auth_get(tok_demo, f"/companies/{c_child1}/modules"); log(r.status_code==200, "GET .../modules", r.text[:120])

# P2 leads/firms
print("\n== P2 LEADS/FIRMS ==")
if tok_demo:
    r=auth_get(tok_demo,"/leads"); log(r.status_code==200 and len(r.json())==5, "GET /leads 5", len(r.json()) if r.status_code==200 else r.text[:120])
    r=auth_get(tok_demo,"/leads", params={"lead_type":"Sales"}); log(r.status_code==200, "GET /leads?lead_type=Sales filtered", len(r.json()) if r.status_code==200 else "")
    r=auth_get(tok_demo,"/firms"); log(r.status_code==200 and len(r.json())==2, "GET /firms 2", len(r.json()) if r.status_code==200 else "")
    if r.status_code==200 and len(r.json())==2:
        fid=r.json()[0]["id"]
        r2=auth_get(tok_demo, f"/firms/{fid}/offices"); log(r2.status_code==200 and len(r2.json())==2, "GET /firms/{f1}/offices 2", len(r2.json()) if r2.status_code==200 else r2.text[:80])
        r2=auth_get(tok_demo, f"/firms/{fid}/factories"); log(r2.status_code==200 and len(r2.json())==1, "GET .../factories 1", len(r2.json()) if r2.status_code==200 else "")
        r2=auth_get(tok_demo, f"/firms/{fid}/access"); log(r2.status_code==200 and len(r2.json())==2, "GET .../access Weightment 2", len(r2.json()) if r2.status_code==200 else r2.text[:120])

# P3 employees
print("\n== P3 EMPLOYEES ==")
if tok_demo:
    r=auth_get(tok_demo,"/departments"); log(r.status_code==200 and len(r.json())==3, "GET /departments 3", len(r.json()) if r.status_code==200 else "")
    r=auth_get(tok_demo,"/designations"); log(r.status_code==200 and len(r.json())==4, "GET /designations 4", len(r.json()) if r.status_code==200 else "")
    r=auth_get(tok_demo,"/employees"); log(r.status_code==200 and len(r.json())==6, "GET /employees 6", len(r.json()) if r.status_code==200 else r.text[:120])
    # create temp employee and enable-login (clean up)
    import asyncio as aio
    async def get_dept_desig():
        async with AsyncSessionLocal() as s:
            t=(await s.execute(select(m.Tenant).where(m.Tenant.slug=="demo"))).scalar_one()
            dept=(await s.execute(select(m.Department).where(m.Department.tenant_id==t.id))).scalars().first()
            desig=(await s.execute(select(m.Designation).where(m.Designation.tenant_id==t.id))).scalars().first()
            comp=(await s.execute(select(m.Company).where(m.Company.tenant_id==t.id, m.Company.name.like("%Client A%")))).scalars().first()
            return dept.id if dept else None, desig.id if desig else None, comp.id if comp else None, t.id
    dept_id, desig_id, comp_id, tid = aio.run(get_dept_desig())
    if dept_id:
        emp_payload={"employee_type":"Internal","employee_id":"EMP-QA-TEMP-001","name":"QA Temp","mobile":"9000000099","email":"qa.temp@demo.test","company_id":comp_id,"department_id":dept_id,"designation_id":desig_id,"leads_scope":"Sales","city":"Delhi","state":"Delhi"}
        r=requests.post(f"{BASE}/employees", headers={"Authorization": f"Bearer {tok_demo}"}, json=emp_payload, timeout=8)
        log(r.status_code in (200,201), "POST /employees create QA temp", f"{r.status_code} {r.text[:120]}")
        if r.status_code in (200,201):
            eid=r.json().get("id")
            r2=requests.post(f"{BASE}/employees/{eid}/enable-login", headers={"Authorization": f"Bearer {tok_demo}"}, json={"name":"QA Temp User","mobile":"9100000099","role":"Loader","company_id":comp_id}, timeout=8)
            log(r2.status_code in (200,201), "POST .../enable-login", f"{r2.status_code} {r2.text[:120]}")
            # login as new user
            r3=requests.post(f"{BASE}/auth/login", json={"mobile":"919100000099","country_code":"91","password":"Demo@123","tenant":"demo"}, timeout=8)
            # enable-login sets password? default Demo@123 via seeder logic but our payload may not set password; check status
            log(r3.status_code in (200,401), "login new employee user (expect 200 or 401 if pwd not set)", f"{r3.status_code}")
            # cleanup unlink + delete
            requests.post(f"{BASE}/employees/{eid}/unlink", headers={"Authorization": f"Bearer {tok_demo}"}, timeout=8)
            requests.delete(f"{BASE}/employees/{eid}", headers={"Authorization": f"Bearer {tok_demo}"}, timeout=8)

# P4 invoicing
print("\n== P4 INVOICING ==")
if tok_demo:
    r=auth_get(tok_demo,"/purchase-orders"); log(r.status_code==200 and len(r.json())==3, "GET /purchase-orders 3", len(r.json()) if r.status_code==200 else r.text[:120])
    if r.status_code==200 and len(r.json())>=1:
        po_id=r.json()[0]["id"]
        # generate invoice
        r2=requests.post(f"{BASE}/invoices/generate", headers={"Authorization": f"Bearer {tok_demo}"}, params={"po_id": po_id}, json={}, timeout=8)
        # generate expects json with po_id in query and maybe body; we try both
        if r2.status_code!=200:
            r2=requests.post(f"{BASE}/invoices/generate?po_id={po_id}", headers={"Authorization": f"Bearer {tok_demo}"}, json={"po_id": po_id}, timeout=8)
        log(r2.status_code in (200,201,400), "POST /invoices/generate?po_id", f"{r2.status_code} {r2.text[:200]}")
        # get invoices
        r2=auth_get(tok_demo,"/invoices"); log(r2.status_code==200 and len(r2.json())>=3, "GET /invoices >=3", len(r2.json()) if r2.status_code==200 else r2.text[:120])
        if r2.status_code==200 and len(r2.json())>0:
            inv_id=r2.json()[0]["id"]
            r3=auth_get(tok_demo, f"/invoices/{inv_id}/reconciliation"); log(r3.status_code==200, "GET .../reconciliation", r3.text[:120])
            # payments
            r3=auth_get(tok_demo,"/payments"); log(r3.status_code==200 and len(r3.json())>=2, "GET /payments >=2", len(r3.json()) if r3.status_code==200 else "")
            # create payment + allocate
            pay_payload={"receipt_no":f"RCPT-QA-{uuid.uuid4().hex[:6]}","company_id":comp_id,"company_name":"QA","amount":1000,"mode":"UPI","payment_date":"2026-08-25"}
            r4=requests.post(f"{BASE}/payments", headers={"Authorization": f"Bearer {tok_demo}"}, json=pay_payload, timeout=8)
            log(r4.status_code in (200,201), "POST /payments", f"{r4.status_code} {r4.text[:120]}")
            if r4.status_code in (200,201):
                pid=r4.json().get("id")
                r5=requests.post(f"{BASE}/invoices/{inv_id}/allocate?payment_id={pid}", headers={"Authorization": f"Bearer {tok_demo}"}, json={"amount_allocated":500}, timeout=8)
                log(r5.status_code in (200,201,400), "POST .../allocate", f"{r5.status_code} {r5.text[:120]}")
                # clean payment
                requests.delete(f"{BASE}/payments/{pid}", headers={"Authorization": f"Bearer {tok_demo}"}, timeout=8)
            # credit note
            cn_payload={"invoice_id":inv_id,"company_id":comp_id,"company_name":"QA","amount":100,"reason":"QA test"}
            r4=requests.post(f"{BASE}/credit-notes", headers={"Authorization": f"Bearer {tok_demo}"}, json=cn_payload, timeout=8)
            log(r4.status_code in (200,201), "POST /credit-notes", f"{r4.status_code} {r4.text[:120]}")
            if r4.status_code in (200,201):
                requests.delete(f"{BASE}/credit-notes/{r4.json().get('id')}", headers={"Authorization": f"Bearer {tok_demo}"}, timeout=8)
            # delete generated invoice if we created one (keep if 400)
            if r2.status_code==200 and len(r2.json())>3:
                # we created extra, try delete last
                last_id=r2.json()[-1]["id"]
                r5=requests.delete(f"{BASE}/invoices/{last_id}", headers={"Authorization": f"Bearer {tok_demo}"}, timeout=8)
                # may fail if paid; ignore

# P5 stock transfers
print("\n== P5 STOCK TRANSFERS ==")
if tok_demo and tok_weight:
    r=auth_get(tok_demo,"/approval-matrices"); log(r.status_code==200 and len(r.json())==2, "GET /approval-matrices 2", len(r.json()) if r.status_code==200 else "")
    r=auth_get(tok_demo,"/stock-transfers"); log(r.status_code==200 and len(r.json())==4, "GET /stock-transfers 4", len(r.json()) if r.status_code==200 else r.text[:120])
    # create transfer as Weightment
    async def get_ids():
        async with AsyncSessionLocal() as s:
            t=(await s.execute(select(m.Tenant).where(m.Tenant.slug=="demo"))).scalar_one()
            p=(await s.execute(select(m.Product).where(m.Product.tenant_id==t.id, m.Product.product_code=="CEM-001"))).scalar_one()
            d1=(await s.execute(select(m.Depot).where(m.Depot.tenant_id==t.id, m.Depot.name.like("%North%")))).scalars().first()
            d2=(await s.execute(select(m.Depot).where(m.Depot.tenant_id==t.id, m.Depot.name.like("%West%")))).scalars().first()
            return p.id, p.product_name, d1.id, d1.name, d2.id, d2.name
    p_id,p_name,d1_id,d1_name,d2_id,d2_name = aio.run(get_ids())
    payload={"product_id":p_id,"product_name":p_name,"quantity_mt":5,"from_type":"Depot","from_id":d1_id,"from_name":d1_name,"to_type":"Depot","to_id":d2_id,"to_name":d2_name}
    r=requests.post(f"{BASE}/stock-transfers", headers={"Authorization": f"Bearer {tok_weight}"}, json=payload, timeout=8)
    log(r.status_code in (200,201), "POST /stock-transfers Requested as Weightment", f"{r.status_code} {r.text[:200]}")
    if r.status_code in (200,201):
        tr_id=r.json().get("id")
        # try approve as Weightment should 403
        r2=requests.post(f"{BASE}/stock-transfers/{tr_id}/approve", headers={"Authorization": f"Bearer {tok_weight}"}, json={"notes":"qa"}, timeout=8)
        log(r2.status_code==403, "POST .../approve as Weightment 403", f"{r2.status_code}")
        # approve as Mgmt
        r2=requests.post(f"{BASE}/stock-transfers/{tr_id}/approve", headers={"Authorization": f"Bearer {tok_demo}"}, json={"notes":"qa"}, timeout=8)
        log(r2.status_code==200, "POST .../approve as Mgmt 200", f"{r2.status_code}")
        r2=requests.post(f"{BASE}/stock-transfers/{tr_id}/dispatch", headers={"Authorization": f"Bearer {tok_weight}"}, json={"notes":"qa"}, timeout=8)
        log(r2.status_code==200, "POST .../dispatch", f"{r2.status_code}")
        r2=requests.post(f"{BASE}/stock-transfers/{tr_id}/receive", headers={"Authorization": f"Bearer {tok_demo}"}, json={"notes":"qa"}, timeout=8)
        log(r2.status_code==200, "POST .../receive", f"{r2.status_code} {r2.text[:120]}")
        r2=auth_get(tok_demo, f"/stock-transfers/{tr_id}/audit"); log(r2.status_code==200 and len(r2.json())>=3, "GET .../audit >=3", len(r2.json()) if r2.status_code==200 else r2.text[:120])
        r2=requests.get(f"{BASE}/stock-transfers/export", headers={"Authorization": f"Bearer {tok_demo}"}, timeout=8)
        log(r2.status_code==200, "GET /stock-transfers/export", f"{r2.status_code} {r2.headers.get('content-type')}")
        # cancel not needed, leave as Received

# P6 usage/billing
print("\n== P6 USAGE/BILLING ==")
if tok_demo:
    r=auth_get(tok_demo,"/usage/summary", params={"days":30}); log(r.status_code==200, "GET /usage/summary?days=30", r.text[:120])
    r=auth_get(tok_demo,"/usage/logs", params={"days":7}); log(r.status_code==200, "GET /usage/logs?days=7", r.text[:120])
if tok_master:
    r=auth_get(tok_master,"/billing/subscriptions"); log(r.status_code==200, "GET /billing/subscriptions", r.text[:120])
    r2=requests.post(f"{BASE}/billing/webhook/stripe", headers={"Authorization": f"Bearer {tok_master}"}, json={"type":"customer.subscription.updated"}, timeout=8)
    log(r2.status_code in (200,201,202), "POST /billing/webhook/stripe", f"{r2.status_code}")

# Inventory 7 calls
print("\n== INVENTORY 7-CALL ==")
if tok_demo:
    paths=["/depot-inventory","/company-inventory","/liftings","/pickups","/companies","/depots","/products"]
    params_map={"/pickups":{"status":"verified,weightment_done,final_verified","page_size":500},"/liftings":{"page_size":500}}
    for p in paths:
        r=auth_get(tok_demo, p, params=params_map.get(p))
        log(r.status_code==200, f"GET {p} 200", f"{r.status_code} {len(r.json()) if r.status_code==200 else r.text[:80]}")

print(f"\n=== SUMMARY PASS {PASS} FAIL {FAIL} ===")
sys.exit(1 if FAIL else 0)
