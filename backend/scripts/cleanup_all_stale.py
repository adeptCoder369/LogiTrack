import asyncio, sys, uuid
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from dotenv import load_dotenv
load_dotenv(ROOT / ".env")
from database import AsyncSessionLocal
import models_sqlalchemy as m
from sqlalchemy import delete, select

def did(slug, *parts):
    return str(uuid.uuid5(uuid.NAMESPACE_DNS, f"{slug}:{':'.join(parts)}"))

PLATFORM = "11111111-1111-1111-1111-111111111111"

# generate all dids for demo/acme
all_dids = set()
for slug in ["demo","acme"]:
    for tbl, name in [
        ("company","source"),("company","parent"),("company","child1"),("company","child2"),
        ("depot","north"),("depot","west"),("depot","jaipur"),
        ("product","cement"),("product","steel"),("product","aggregate"),
        ("transporter","1"),("transporter","2"),
        ("truck","1"),("truck","2"),("truck","3"),("truck","4"),("truck","5"),
        ("region","north"),("region","west"),
        ("loc","delhi"),("loc","jaipur"),("loc","mumbai"),
        ("user","1"),("user","2"),("user","3"),("user","4"),("user","5"),("user","6"),("user","7"),("user","8"),
        ("emp","1"),("emp","2"),("emp","3"),("emp","4"),("emp","5"),("emp","6"),
        ("dept","ops"),("dept","sales"),("dept","accounts"),
        ("desig","manager"),("desig","executive"),("desig","weigher"),("desig","accountant"),
        ("lead","1"),("lead","2"),("lead","3"),("lead","4"),("lead","5"),
        ("firm","1"),("firm","2"),
    ]:
        all_dids.add(did(slug, tbl, name))
    # more
    for i in range(1,6):
        all_dids.add(did(slug,"truck",str(i)))
    for i in range(1,4):
        all_dids.add(did(slug,"do",str(i)))
        all_dids.add(did(slug,"po",str(i)))
        all_dids.add(did(slug,"invoice",str(i)))
    for i in range(1,9):
        all_dids.add(did(slug,"pickup",str(i)))

print(f"generated {len(all_dids)} dids")

async def clean():
    async with AsyncSessionLocal() as s:
        models = [m.Company, m.Depot, m.Product, m.Transporter, m.Truck, m.User, m.Employee, m.Department, m.Designation, m.Region, m.Location, m.Lead, m.Firm, m.DepotInventory, m.CompanyInventory, m.DeliveryOrder, m.PurchaseOrder, m.Lifting, m.Pickup, m.Invoice, m.Payment, m.StockTransfer, m.SourceProduct, m.ProductOverride, m.CompanyPricing, m.ClientOffice, m.ClientFactory, m.FirmOffice, m.FirmFactory, m.FirmAccess, m.ClientModule, m.InvoiceItem, m.InvoicePayment, m.CreditNote, m.DebitNote, m.StockTransferAudit, m.ApprovalMatrix, m.Subscription, m.BillingEvent, m.UsageLog]
        total = 0
        for model in models:
            try:
                # delete where id in dids and tenant_id=platform (stale)
                if hasattr(model, "tenant_id"):
                    res = await s.execute(delete(model).where(model.id.in_(list(all_dids))).where(model.tenant_id==PLATFORM))
                    if res.rowcount:
                        print(f"  cleaned {model.__tablename__}: {res.rowcount}")
                        total += res.rowcount
            except Exception as e:
                print(f"  {model.__tablename__} err {e}")
        await s.commit()
        print(f"total cleaned {total}")

asyncio.run(clean())
