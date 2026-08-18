# Routes package
from .reports import router as reports_router
from .companies import router as companies_router
from .transporters import router as transporters_router
from .trucks import router as trucks_router
from .products import router as products_router
from .railway_sidings import router as railway_sidings_router
from .railway_zones import router as railway_zones_router
from .depots import router as depots_router
from .delivery_orders import router as delivery_orders_router
from .liftings import router as liftings_router
from .permissions import router as permissions_router
from .product_access import router as product_access_router
from .depot_access import router as depot_access_router
from .purchase_orders import router as purchase_orders_router
from .pickups import router as pickups_router
from .verified_trucks import router as verified_trucks_router
from .company_inventory import router as company_inventory_router
from .tenants import router as tenants_router
from .source_access import router as source_access_router
from .sources import router as sources_router
from .product_management import router as product_management_router
from .locations import router as locations_router
from .leads import router as leads_router
from .firms import router as firms_router
from .employees import router as employees_router

__all__ = [
    'reports_router', 'companies_router', 'transporters_router',
    'trucks_router', 'products_router', 'railway_sidings_router',
    'railway_zones_router', 'depots_router', 'delivery_orders_router',
    'liftings_router', 'permissions_router', 'product_access_router',
    'depot_access_router', 'purchase_orders_router', 'pickups_router',
    'verified_trucks_router', 'company_inventory_router', 'tenants_router',
    'source_access_router', 'sources_router', 'product_management_router',
    'locations_router', 'leads_router', 'firms_router', 'employees_router',
]
