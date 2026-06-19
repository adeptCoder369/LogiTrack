uvicorn server:app --host 0.0.0.0 --port 8000 --reload      
STOCK IN == creating the Primary Lifting ...



so 
there is this new requirement :
that now a DO can be made with the Destination Type * can be : the depot or the company,

THE flow being :
on slecton of the depot destination the dropdown shopws the option to selcetion the depot and vice versa the company if that being selected  
current flow fully made around the depot and the inventory wallet made around the depot 
then the companies onoly holds the clinet type one
but now we want another source of the inventory wallet that the Management role would be handling : The comanpy itself !   
See the intetntion being the inventory can stay in the company and can be directly  shipped to the client through the usual  PO(Ourchase Order) flow, then the company acted as the client/customer only
now that company can be the one holding the iventory that copuld be demanded by other clients and thus the management wanted to fullfill that PO without first getting the DO into one of his depots , to save the obvious logistics cost in real world.
the invetory could be later DO-ed to one of his depots later he wants 
but wanted to have full control over the transaction details , like he would like to be able to see which POs have been fullfilled throguh the companies , how much remains , option to have certain amount get transferred to his depot , this that transaction details etc.

in the /companies , we will be adding the types : source , client , both (?)

now look the whole repo and sketch me out the plan and feasbaility and challenges if any 
=========================
Based on my analysis of the codebase, here's the comprehensive plan:
Current Architecture Analysis
Existing Models:
- Company: Has is_client boolean (auto-set on verified lifting)
- DeliveryOrder: Has destination_type (Depot/Company), from_company_id, to_depot_id/to_company_id
- Lifting: Has loading_point_type/unloading_point_type (Company/Depot), company_id
- DepotInventory: Tracks stock at depot level only
- PurchaseOrder: Requires depot_id as inventory source
Current Flow Limitation:
- POs require depot-based inventory
- Company-to-client primary liftings skip inventory tracking
- The "To Company" destination type in DOs is commented out in UI
Implementation Plan
Phase 1: Backend Changes
1. Company Model Enhancement (models.py:93-122)
Add company_type field:
company_type: Optional[str] = "Client"  # Source | Client | Both
# Keep is_client for backward compatibility
2. New Company Inventory Collection (models.py)
Create CompanyInventory model parallel to DepotInventory:
class CompanyInventory(BaseModel):
    id: str
    company_id: str
    company_name: str
    product_id: str
    product_name: str
    total_received: float = 0
    total_dispatched: float = 0
    available_quantity: float = 0
    last_updated: str
3. Purchase Order Changes (purchase_orders.py)
- Make depot_id optional when source company has company_type="Source" or "Both"
- Add validation: either depot OR company (with source type) must be specified
- Add company inventory check for fulfillment
4. Lifting Route Changes (liftings.py)
- Handle loading_point_type="Company" for Secondary when company is source
- Update company inventory instead of depot inventory
- Add reverse inventory update logic for rejections
5. New API Endpoints (routes/company_inventory.py)
- GET /company-inventory/{company_id} - Get inventory for source company
- GET /company-inventory/ledger/{company_id}/{product_id} - Transaction history
- Company inventory ledger for Management role
Phase 2: Frontend Changes
1. Companies.jsx
- Add "Company Type" dropdown (Source/Client/Both) in form
- Display company type badge in table
- Filter companies by type in dropdowns
2. PurchaseOrders.jsx
- Add "Source Type" selector: Depot vs Company
- Show depot dropdown when "Depot" selected
- Show company dropdown (filter by type=Source|Both) when "Company" selected
- Fetch company inventory for validation
3. InventoryWallet.jsx
- Add tab for "Company Inventory" alongside depot view
- Show companies with source inventory
- Reuse ledger component for company transactions
4. DeliveryOrders.jsx
- Uncomment/re-enable "To Company" destination option
- Update destination dropdown logic
Phase 3: Challenges & Considerations
Challenge	Mitigation
Data Migration	Backfill company_type for existing companies
Permission Model	Extend auth_utils.py - Management sees all, role-based access for company inventory
Inventory Consistency	Ensure atomic updates with MongoDB transactions
UI Complexity	Use conditional rendering to avoid overwhelming users
Reporting	Add company inventory reports for Management
Key Questions for Clarification
1. Should POs created for company-source use a separate number sequence (e.g., PO-COMP-xxx)?
2. Should the Management role see all company inventory, or only companies they manage?
3. For the transfer flow (company → depot), should that be a separate DO type or reuse existing?
4. Any limit on how many companies can be marked as "Source"?