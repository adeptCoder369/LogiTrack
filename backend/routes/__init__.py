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

__all__ = [
    'reports_router',
    'companies_router',
    'transporters_router',
    'trucks_router',
    'products_router',
    'railway_sidings_router',
    'railway_zones_router',
    'depots_router',
    'delivery_orders_router',
    'liftings_router',
    'permissions_router',
    'product_access_router'
    ,
    'depot_access_router'
    ,
    'pickups_router',
    'verified_trucks_router'
]
