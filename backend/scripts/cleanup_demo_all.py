import asyncio, sys, uuid
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from dotenv import load_dotenv
load_dotenv(ROOT / ".env")
from database import AsyncSessionLocal
import models_sqlalchemy as m
from sqlalchemy import delete

def did(slug, *parts):
    return str(uuid.uuid5(uuid.NAMESPACE_DNS, f"{slug}:{':'.join(parts)}"))

PLATFORM = "11111111-1111-1111-1111-111111111111"

async def clean():
    async with AsyncSessionLocal() as s:
        for slug in ["demo","acme"]:
            dids = []
            # core
            for tbl, names in [
                ("company",["source","parent","child1","child2"]),
                ("depot",["north","west","jaipur"]),
                ("product",["cement","steel","aggregate"]),
                ("region",["north","west"]),
                ("loc",["delhi","jaipur","mumbai"]),
                ("transporter",["1","2"]),
                ("user",["1","2","3","4","5","6","7","8"]),
                ("emp",["1","2","3","4","5","6"]),
                ("dept",["ops","sales","accounts"]),
                ("desig",["manager","executive","weigher","accountant"]),
                ("lead",["1","2","3","4","5"]),
                ("firm",["1","2"]),
            ]:
                for n in names:
                    dids.append(did(slug, tbl, n))
            for i in range(1,6):
                dids.append(did(slug,"truck",str(i)))
            for i in range(1,4):
                dids.append(did(slug,"rz","1") if i==1 else did(slug,"rs",str(i-1)) if i<=2 else "")
                dids.append(did(slug,"do",str(i)))
                dids.append(did(slug,"po",str(i)))
                dids.append(did(slug,"invoice",str(i)))
                dids.append(did(slug,"invitem",str(i)))
            for n in ["d1-p1","d1-p2","d2-p3","c1-p1"]:
                dids.append(did(slug,"inv",n))
            for i in range(1,7):
                dids.append(did(slug,"lifting",str(i)))
            for i in range(1,9):
                dids.append(did(slug,"pickup",str(i)))
            for i in range(1,4):
                dids.append(did(slug,"vt",str(i)))
            for n in ["1","2"]:
                dids.append(did(slug,"pay",n))
                dids.append(did(slug,"invpay",n))
                dids.append(did(slug,"am",n))
            dids += [did(slug,"cn","1"), did(slug,"dn","1")]
            for i in range(1,5):
                dids.append(did(slug,"tr","transfer",str(i)))
                for ev in ["Requested","Approved","Dispatched","Received"]:
                    dids.append(did(slug,"audit",str(i),ev))
            dids += [did(slug,"sub","1"), did(slug,"be","1")]
            dids += [did(slug,"office","c1-ho"), did(slug,"office","c1-br"), did(slug,"factory","c1-p1")]
            dids += [did(slug,"firm_off","1"), did(slug,"firm_off","2"), did(slug,"firm_fac","1"), did(slug,"fa","1"), did(slug,"fa","2")]
            # product overrides/pricing
            dids += [did(slug,"ov","c1-p1"), did(slug,"pricing","c1-p1"), did(slug,"pricing","c1-p2"), did(slug,"pricing","c2-p1")]
            # modules
            for mod in ["invoices","stock_transfers","leads","reports"]:
                # need company ids
                c1 = did(slug,"company","child1")
                dids.append(did(slug,"mod",c1,mod))
            dids = [d for d in dids if d]
            # delete from each table where id in dids
            for model in [m.Company, m.Depot, m.Product, m.Region, m.Location, m.Transporter, m.Truck, m.User, m.Employee, m.Department, m.Designation, m.RailwayZone, m.RailwaySiding, m.DeliveryOrder, m.PurchaseOrder, m.DepotInventory, m.CompanyInventory, m.Lifting, m.Pickup, m.VerifiedTruck, m.Invoice, m.InvoiceItem, m.Payment, m.InvoicePayment, m.CreditNote, m.DebitNote, m.Lead, m.Firm, m.FirmOffice, m.FirmFactory, m.FirmAccess, m.ClientOffice, m.ClientFactory, m.ClientModule, m.ProductOverride, m.CompanyPricing, m.SourceProduct, m.StockTransfer, m.StockTransferAudit, m.ApprovalMatrix, m.Subscription, m.BillingEvent, m.UsageLog]:
                try:
                    await s.execute(delete(model).where(model.id.in_(dids)))
                except Exception:
                    await s.rollback()
            print(f"cleaned {slug} ({len(dids)} ids)")
        await s.commit()
        print("done")

asyncio.run(clean())
