import requests, uuid, json, sys
BASE="http://localhost:8000/api/v1"
PASS=0; FAIL=0
def log(ok, msg, detail=""):
    global PASS, FAIL
    if ok:
        PASS+=1; print(f" PASS {msg} {detail}")
    else:
        FAIL+=1; print(f" FAIL {msg} {detail}")
def login(mobile, tenant, pwd="Demo@123"):
    r=requests.post(f"{BASE}/auth/login", json={"mobile":mobile,"country_code":"91","password":pwd,"tenant":tenant} if tenant else {"mobile":mobile,"country_code":"91","password":pwd}, timeout=8)
    return (r.json()["token"] if r.status_code==200 else None), r
def auth_get(token, path, params=None, headers_extra=None):
    h={"Authorization": f"Bearer {token}"}
    if headers_extra: h.update(headers_extra)
    return requests.get(f"{BASE}{path}", headers=h, params=params, timeout=8)

print("== BASELINE ==")
tok_demo,_=login("919000000001","demo")
tok_acme,_=login("919000000001","acme")
tok_weight,_=login("919000000004","demo")
tok_dstaff,_=login("919000000005","demo")
log(tok_demo is not None, "login demo-Mgmt")
log(tok_acme is not None, "login acme-Mgmt")
# companies isolation
for tok, slug, exp in [(tok_demo,"demo",4),(tok_acme,"acme",4)]:
    r=auth_get(tok,"/companies")
    log(r.status_code==200 and len(r.json())==exp, f"GET /companies {slug} {exp}", f"{r.status_code} {len(r.json()) if r.status_code==200 else ''}")
    r=auth_get(tok,"/products")
    log(r.status_code==200 and len(r.json())==3, f"GET /products {slug} 3", len(r.json()) if r.status_code==200 else r.text[:80])
    r=auth_get(tok,"/depots")
    log(r.status_code==200 and len(r.json())==3, f"GET /depots {slug} 3", len(r.json()) if r.status_code==200 else "")

r=requests.post(f"{BASE}/auth/login", json={"mobile":"919999999999","country_code":"91","password":"Master@123"}, timeout=8)
tok_master=r.json()["token"] if r.status_code==200 else None
log(tok_master is not None, "login master")
r=auth_get(tok_master,"/tenants")
log(r.status_code==200 and len(r.json())>=3, "GET /tenants master >=3", f"{len(r.json()) if r.status_code==200 else ''}")
r=auth_get(tok_master,"/companies")
log(r.status_code==200 and len(r.json())>=10, "GET /companies master >=10", f"{len(r.json()) if r.status_code==200 else r.text[:80]}")
r2=requests.get(f"{BASE}/companies", headers={"Authorization": f"Bearer {tok_master}", "Origin":"http://localhost:3000"}, timeout=8)
log(r2.headers.get("Access-Control-Allow-Origin")=="*", "CORS header *", r2.headers.get("Access-Control-Allow-Origin"))

# tenant config with auth (it requires auth)
r=auth_get(tok_demo,"/tenant/config")
log(r.status_code==200, "GET /tenant/config with auth", str(r.json())[:80] if r.status_code==200 else r.text[:80])

print("\n== P1 SOURCE ==")
r=auth_get(tok_demo,"/products")
log(r.status_code==200 and len(r.json())==3, "Mgmt products 3", len(r.json()) if r.status_code==200 else "")
r=auth_get(tok_weight,"/products")
log(r.status_code==200 and len(r.json())==1, "Weightment products 1", len(r.json()) if r.status_code==200 else r.text[:80])
r=auth_get(tok_dstaff,"/products")
log(r.status_code==200 and len(r.json())==2, "DStaff products 2", len(r.json()) if r.status_code==200 else "")
r=auth_get(tok_demo,"/sources", params={"type":"Depot"})
log(r.status_code==200 and len(r.json())>=1, "GET /sources Mgmt", len(r.json()) if r.status_code==200 else "")
r=auth_get(tok_weight,"/sources", params={"type":"Depot"})
log(r.status_code==200, "GET /sources Weightment", len(r.json()) if r.status_code==200 else "")
# get c_child1 via companies
r=auth_get(tok_demo,"/companies")
c_child1=None; p1=None
if r.status_code==200:
    for c in r.json():
        if "Client A" in c["name"]:
            c_child1=c["id"]
        if "Parent Ltd" in c["name"]:
            parent_id=c["id"]
    # get p1 via products
    rp=auth_get(tok_demo,"/products")
    if rp.status_code==200:
        for p in rp.json():
            if p["product_code"]=="CEM-001":
                p1=p["id"]
    if c_child1:
        r=auth_get(tok_demo,"/product-overrides", params={"company_id":c_child1})
        log(r.status_code==200 and len(r.json())==1, "GET /product-overrides 1", len(r.json()) if r.status_code==200 else r.text[:80])
        r=auth_get(tok_demo,"/company-pricing", params={"company_id":c_child1})
        log(r.status_code==200 and len(r.json())>=2, "GET /company-pricing >=2", len(r.json()) if r.status_code==200 else "")
        if p1:
            r=auth_get(tok_demo,f"/products/{p1}/effective", params={"company_id":c_child1})
            log(r.status_code==200, "GET /products/effective", r.text[:80])

print("\n== P2 LOCATIONS ==")
r=auth_get(tok_demo,"/regions")
log(r.status_code==200 and len(r.json())==2, "GET /regions 2", len(r.json()) if r.status_code==200 else "")
r=auth_get(tok_demo,"/locations")
log(r.status_code==200 and len(r.json())==3, "GET /locations 3", len(r.json()) if r.status_code==200 else "")
r=auth_get(tok_demo,"/locations/tree")
log(r.status_code==200, "GET /locations/tree", str(r.json())[:80] if r.status_code==200 else "")
if c_child1:
    r=auth_get(tok_demo,f"/companies/{c_child1}/offices")
    log(r.status_code==200 and len(r.json())==2, "GET offices 2", len(r.json()) if r.status_code==200 else r.text[:80])
    r=auth_get(tok_demo,f"/companies/{c_child1}/factories")
    log(r.status_code==200 and len(r.json())==1, "GET factories 1", len(r.json()) if r.status_code==200 else "")
    r=auth_get(tok_demo,f"/companies/{c_child1}/modules")
    log(r.status_code==200, "GET modules", r.text[:80])

print("\n== P2 LEADS/FIRMS ==")
r=auth_get(tok_demo,"/leads")
log(r.status_code==200 and len(r.json())==5, "GET /leads 5", len(r.json()) if r.status_code==200 else r.text[:80])
r=auth_get(tok_demo,"/leads", params={"lead_type":"Sales"})
log(r.status_code==200 and len(r.json())>=2, "GET /leads?Sales", len(r.json()) if r.status_code==200 else "")
r=auth_get(tok_demo,"/firms")
log(r.status_code==200 and len(r.json())==2, "GET /firms 2", len(r.json()) if r.status_code==200 else r.text[:80])
if r.status_code==200 and len(r.json())==2:
    fid=r.json()[0]["id"]
    r2=auth_get(tok_demo,f"/firms/{fid}/offices")
    log(r2.status_code==200 and len(r2.json())==2, "GET firm offices 2", len(r2.json()) if r2.status_code==200 else r2.text[:80])
    r2=auth_get(tok_demo,f"/firms/{fid}/factories")
    log(r2.status_code==200 and len(r2.json())==1, "GET firm factories 1", len(r2.json()) if r2.status_code==200 else "")
    r2=auth_get(tok_demo,f"/firms/{fid}/access")
    log(r2.status_code==200 and len(r2.json())==2, "GET firm access 2", len(r2.json()) if r2.status_code==200 else r2.text[:80])

print("\n== P3 EMPLOYEES ==")
r=auth_get(tok_demo,"/departments")
log(r.status_code==200 and len(r.json())==3, "GET /departments 3", len(r.json()) if r.status_code==200 else "")
r=auth_get(tok_demo,"/designations")
log(r.status_code==200 and len(r.json())==4, "GET /designations 4", len(r.json()) if r.status_code==200 else "")
r=auth_get(tok_demo,"/employees")
log(r.status_code==200 and len(r.json())==6, "GET /employees 6", len(r.json()) if r.status_code==200 else r.text[:80])
# create temp employee via API (no DB)
if r.status_code==200:
    # get dept/desig via previous calls
    r_dept=auth_get(tok_demo,"/departments")
    r_desig=auth_get(tok_demo,"/designations")
    dept_id=r_dept.json()[0]["id"] if r_dept.status_code==200 and r_dept.json() else None
    desig_id=r_desig.json()[0]["id"] if r_desig.status_code==200 and r_desig.json() else None
    if dept_id and desig_id and c_child1:
        emp_payload={"employee_type":"Internal","employee_id":"EMP-QA-TEMP-002","name":"QA Temp2","mobile":"9000000098","email":"qa2@demo.test","company_id":c_child1,"department_id":dept_id,"designation_id":desig_id,"leads_scope":"Sales","city":"Delhi","state":"Delhi"}
        r2=requests.post(f"{BASE}/employees", headers={"Authorization": f"Bearer {tok_demo}"}, json=emp_payload, timeout=8)
        log(r2.status_code in (200,201), "POST /employees QA temp", f"{r2.status_code} {r2.text[:100]}")
        if r2.status_code in (200,201):
            eid=r2.json().get("id")
            r3=requests.post(f"{BASE}/employees/{eid}/enable-login", headers={"Authorization": f"Bearer {tok_demo}"}, json={"name":"QA Temp2 User","mobile":"9100000098","role":"Loader","company_id":c_child1}, timeout=8)
            log(r3.status_code in (200,201), "POST enable-login", f"{r3.status_code} {r3.text[:80]}")
            requests.post(f"{BASE}/employees/{eid}/unlink", headers={"Authorization": f"Bearer {tok_demo}"}, timeout=8)
            requests.delete(f"{BASE}/employees/{eid}", headers={"Authorization": f"Bearer {tok_demo}"}, timeout=8)

print("\n== P4 INVOICING ==")
r=auth_get(tok_demo,"/purchase-orders")
log(r.status_code==200 and len(r.json())==3, "GET /purchase-orders 3", len(r.json()) if r.status_code==200 else r.text[:80])
if r.status_code==200 and len(r.json())>=1:
    po_id=r.json()[0]["id"]
    r2=requests.post(f"{BASE}/invoices/generate", headers={"Authorization": f"Bearer {tok_demo}"}, params={"po_id": po_id}, json={}, timeout=8)
    if r2.status_code!=200:
        r2=requests.post(f"{BASE}/invoices/generate?po_id={po_id}", headers={"Authorization": f"Bearer {tok_demo}"}, json={"po_id": po_id}, timeout=8)
    log(r2.status_code in (200,201,400), "POST /invoices/generate", f"{r2.status_code} {r2.text[:100]}")
    r2=auth_get(tok_demo,"/invoices")
    log(r2.status_code==200 and len(r2.json())>=3, "GET /invoices >=3", len(r2.json()) if r2.status_code==200 else r2.text[:80])
    if r2.status_code==200 and len(r2.json())>0:
        inv_id=r2.json()[0]["id"]
        r3=auth_get(tok_demo,f"/invoices/{inv_id}/reconciliation")
        log(r3.status_code==200, "GET reconciliation", r3.text[:80])
        r3=auth_get(tok_demo,"/payments")
        log(r3.status_code==200 and len(r3.json())>=2, "GET /payments >=2", len(r3.json()) if r3.status_code==200 else "")
        pay_payload={"receipt_no":f"RCPT-QA-{uuid.uuid4().hex[:6]}","company_id":c_child1,"company_name":"QA","amount":1000,"mode":"UPI","payment_date":"2026-08-25"}
        r4=requests.post(f"{BASE}/payments", headers={"Authorization": f"Bearer {tok_demo}"}, json=pay_payload, timeout=8)
        log(r4.status_code in (200,201), "POST /payments", f"{r4.status_code} {r4.text[:80]}")
        if r4.status_code in (200,201):
            pid=r4.json().get("id")
            r5=requests.post(f"{BASE}/invoices/{inv_id}/allocate", headers={"Authorization": f"Bearer {tok_demo}"}, params={"payment_id": pid}, json={"amount_allocated":500}, timeout=8)
            log(r5.status_code in (200,201,400), "POST allocate", f"{r5.status_code} {r5.text[:80]}")
            requests.delete(f"{BASE}/payments/{pid}", headers={"Authorization": f"Bearer {tok_demo}"}, timeout=8)
        cn_payload={"invoice_id":inv_id,"company_id":c_child1,"company_name":"QA","amount":100,"reason":"QA test"}
        r4=requests.post(f"{BASE}/credit-notes", headers={"Authorization": f"Bearer {tok_demo}"}, json=cn_payload, timeout=8)
        log(r4.status_code in (200,201), "POST credit-notes", f"{r4.status_code} {r4.text[:80]}")
        if r4.status_code in (200,201):
            requests.delete(f"{BASE}/credit-notes/{r4.json().get('id')}", headers={"Authorization": f"Bearer {tok_demo}"}, timeout=8)
        if len(r2.json())>3:
            last_id=r2.json()[-1]["id"]
            requests.delete(f"{BASE}/invoices/{last_id}", headers={"Authorization": f"Bearer {tok_demo}"}, timeout=8)

print("\n== P5 TRANSFERS ==")
r=auth_get(tok_demo,"/approval-matrices")
log(r.status_code==200 and len(r.json())==2, "GET approval-matrices 2", len(r.json()) if r.status_code==200 else "")
r=auth_get(tok_demo,"/stock-transfers")
log(r.status_code==200 and len(r.json())==4, "GET stock-transfers 4", len(r.json()) if r.status_code==200 else r.text[:80])
# get ids via API
r_prod=auth_get(tok_demo,"/products")
r_depot=auth_get(tok_demo,"/depots")
if r_prod.status_code==200 and r_depot.status_code==200:
    p_id=[p for p in r_prod.json() if p["product_code"]=="CEM-001"][0]["id"]
    p_name=[p for p in r_prod.json() if p["product_code"]=="CEM-001"][0]["product_name"]
    d1=[d for d in r_depot.json() if "North" in d["name"]][0]
    d2=[d for d in r_depot.json() if "West" in d["name"]][0]
    payload={"product_id":p_id,"product_name":p_name,"quantity_mt":5,"from_type":"Depot","from_id":d1["id"],"from_name":d1["name"],"to_type":"Depot","to_id":d2["id"],"to_name":d2["name"]}
    r=requests.post(f"{BASE}/stock-transfers", headers={"Authorization": f"Bearer {tok_weight}"}, json=payload, timeout=8)
    log(r.status_code in (200,201), "POST transfer Requested", f"{r.status_code} {r.text[:100]}")
    if r.status_code in (200,201):
        tr_id=r.json().get("id")
        r2=requests.post(f"{BASE}/stock-transfers/{tr_id}/approve", headers={"Authorization": f"Bearer {tok_weight}"}, json={"notes":"qa"}, timeout=8)
        log(r2.status_code==403, "approve as Weightment 403", f"{r2.status_code}")
        r2=requests.post(f"{BASE}/stock-transfers/{tr_id}/approve", headers={"Authorization": f"Bearer {tok_demo}"}, json={"notes":"qa"}, timeout=8)
        log(r2.status_code==200, "approve as Mgmt 200", f"{r2.status_code}")
        r2=requests.post(f"{BASE}/stock-transfers/{tr_id}/dispatch", headers={"Authorization": f"Bearer {tok_weight}"}, json={"notes":"qa"}, timeout=8)
        log(r2.status_code==200, "dispatch 200", f"{r2.status_code}")
        r2=requests.post(f"{BASE}/stock-transfers/{tr_id}/receive", headers={"Authorization": f"Bearer {tok_demo}"}, json={"notes":"qa"}, timeout=8)
        log(r2.status_code==200, "receive 200", f"{r2.status_code} {r2.text[:80]}")
        r2=auth_get(tok_demo,f"/stock-transfers/{tr_id}/audit")
        log(r2.status_code==200 and len(r2.json())>=3, "audit >=3", len(r2.json()) if r2.status_code==200 else r2.text[:80])
        r2=requests.get(f"{BASE}/stock-transfers/export", headers={"Authorization": f"Bearer {tok_demo}"}, timeout=8)
        log(r2.status_code==200, "export 200", f"{r2.status_code}")

print("\n== P6 USAGE/BILLING ==")
r=auth_get(tok_demo,"/usage/summary", params={"days":30})
log(r.status_code==200, "GET usage summary", r.text[:80])
r=auth_get(tok_demo,"/usage/logs", params={"days":7})
log(r.status_code==200, "GET usage logs", r.text[:80])
r=auth_get(tok_master,"/billing/subscriptions")
log(r.status_code==200, "GET billing subs", r.text[:80])
r2=requests.post(f"{BASE}/billing/webhook/stripe", headers={"Authorization": f"Bearer {tok_master}"}, json={"type":"customer.subscription.updated"}, timeout=8)
log(r2.status_code in (200,201,202), "POST webhook stripe", f"{r2.status_code}")

print("\n== INVENTORY 7-CALL ==")
for p in ["/depot-inventory","/company-inventory","/liftings","/pickups","/companies","/depots","/products"]:
    params={"status":"verified,weightment_done,final_verified","page_size":500} if p=="/pickups" else {"page_size":500} if p=="/liftings" else None
    r=auth_get(tok_demo,p, params=params)
    log(r.status_code==200, f"GET {p} 200", f"{len(r.json()) if r.status_code==200 else r.text[:80]}")

print(f"\n=== SUMMARY PASS {PASS} FAIL {FAIL} ===")
sys.exit(1 if FAIL else 0)
