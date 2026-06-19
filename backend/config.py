"""Application configuration"""
import os
from pathlib import Path
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET')
if not JWT_SECRET:
    raise ValueError("JWT_SECRET environment variable is required")
JWT_ALGORITHM = "HS256"

# MSG91 Configuration
MSG91_AUTHKEY = os.environ.get('MSG91_AUTHKEY', '')
MSG91_TEMPLATE_ID = os.environ.get('MSG91_TEMPLATE_ID', '')
MSG91_DLT_TE_ID = os.environ.get('MSG91_DLT_TE_ID', '')
MSG91_SENDER_ID = "INFOET"
OTP_EXPIRY_SECONDS = 120  # 2 minutes
MAX_OTP_ATTEMPTS = 5

# Upload directory
UPLOAD_DIR = ROOT_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

# Country codes
COUNTRY_CODES = {
    "IN": {"code": "91", "name": "India", "flag": "🇮🇳"},
    "NP": {"code": "977", "name": "Nepal", "flag": "🇳🇵"},
    "BD": {"code": "880", "name": "Bangladesh", "flag": "🇧🇩"},
    "VN": {"code": "84", "name": "Vietnam", "flag": "🇻🇳"},
    "BT": {"code": "975", "name": "Bhutan", "flag": "🇧🇹"},
    "AE": {"code": "971", "name": "UAE", "flag": "🇦🇪"},
}

# Permission defaults — (View) controls sidebar/route access; (Create/Update/Delete) control action buttons
PERMISSION_DEFAULTS = {
    # Dashboard
    "Dashboard": {"Admin": True, "Management": True, "Loader": True, "Depot Manager": True, "Depot Staff": True, "Depot Supervisor": True},

    # Delivery Orders
    "Delivery Orders (View)": {"Admin": True, "Management": True, "Loader": False, "Depot Manager": False, "Depot Staff": False, "Depot Supervisor": False},
    "Delivery Orders (Create)": {"Admin": True, "Management": True, "Loader": False, "Depot Manager": False, "Depot Staff": False, "Depot Supervisor": False},
    "Delivery Orders (Update)": {"Admin": True, "Management": True, "Loader": False, "Depot Manager": False, "Depot Staff": False, "Depot Supervisor": False},
    "Delivery Orders (Delete)": {"Admin": True, "Management": True, "Loader": False, "Depot Manager": False, "Depot Staff": False, "Depot Supervisor": False},

    # Liftings
    "Liftings (View)": {"Admin": True, "Management": True, "Loader": True, "Depot Manager": True, "Depot Staff": True, "Depot Supervisor": True},
    "Liftings (Create)": {"Admin": True, "Management": True, "Loader": True, "Depot Manager": True, "Depot Staff": True, "Depot Supervisor": True},
    "Liftings (Update)": {"Admin": True, "Management": True, "Loader": False, "Depot Manager": True, "Depot Staff": False, "Depot Supervisor": False},
    "Liftings (Delete)": {"Admin": True, "Management": True, "Loader": False, "Depot Manager": False, "Depot Staff": False, "Depot Supervisor": False},
    "Primary Liftings (Create)": {"Admin": True, "Management": True, "Loader": True, "Depot Manager": False, "Depot Staff": False, "Depot Supervisor": False},
    "Secondary Liftings (Create)": {"Admin": True, "Management": True, "Loader": False, "Depot Manager": True, "Depot Staff": True, "Depot Supervisor": True},

    # Pickups
    "Schedule Pickup": {"Admin": True, "Management": True, "Loader": True, "Depot Manager": False, "Depot Staff": False, "Depot Supervisor": False},
    "Pickup (Execution)": {"Admin": True, "Management": True, "Loader": True, "Depot Manager": True, "Depot Staff": True, "Depot Supervisor": True},
    "Verify Pickup": {"Admin": True, "Management": True, "Loader": False, "Depot Manager": True, "Depot Staff": False, "Depot Supervisor": True},

    # Verification (Unloading)
    "Verification (Unloading)": {"Admin": True, "Management": True, "Loader": False, "Depot Manager": True, "Depot Staff": False, "Depot Supervisor": True},

    # Wallets
    "Inventory Wallet (View)": {"Admin": True, "Management": True, "Loader": False, "Depot Manager": True, "Depot Staff": True, "Depot Supervisor": True},
    "DO Wallet (View)": {"Admin": True, "Management": True, "Loader": True, "Depot Manager": False, "Depot Staff": False, "Depot Supervisor": False},

    # Reports
    "Company Reports": {"Admin": True, "Management": True, "Loader": False, "Depot Manager": True, "Depot Staff": True, "Depot Supervisor": True},
    "Lifting Reports": {"Admin": True, "Management": True, "Loader": False, "Depot Manager": True, "Depot Staff": True, "Depot Supervisor": True},

    # Master Data — View (sidebar/route)
    "Trucks (View)": {"Admin": True, "Management": True, "Loader": True, "Depot Manager": True, "Depot Staff": True, "Depot Supervisor": True},
    "Trucks (Create)": {"Admin": True, "Management": True, "Loader": False, "Depot Manager": False, "Depot Staff": False, "Depot Supervisor": False},
    "Trucks (Update)": {"Admin": True, "Management": True, "Loader": False, "Depot Manager": False, "Depot Staff": False, "Depot Supervisor": False},
    "Trucks (Delete)": {"Admin": True, "Management": True, "Loader": False, "Depot Manager": False, "Depot Staff": False, "Depot Supervisor": False},

    "Companies (View)": {"Admin": True, "Management": True, "Loader": False, "Depot Manager": True, "Depot Staff": True, "Depot Supervisor": True},
    "Companies (Create)": {"Admin": True, "Management": True, "Loader": False, "Depot Manager": False, "Depot Staff": False, "Depot Supervisor": False},
    "Companies (Update)": {"Admin": True, "Management": True, "Loader": False, "Depot Manager": False, "Depot Staff": False, "Depot Supervisor": False},
    "Companies (Delete)": {"Admin": True, "Management": True, "Loader": False, "Depot Manager": False, "Depot Staff": False, "Depot Supervisor": False},

    "Company Users (View)": {"Admin": True, "Management": True, "Loader": False, "Depot Manager": False, "Depot Staff": False, "Depot Supervisor": False},
    "Company Users (Create)": {"Admin": True, "Management": True, "Loader": False, "Depot Manager": False, "Depot Staff": False, "Depot Supervisor": False},
    "Company Users (Update)": {"Admin": True, "Management": True, "Loader": False, "Depot Manager": False, "Depot Staff": False, "Depot Supervisor": False},
    "Company Users (Delete)": {"Admin": True, "Management": True, "Loader": False, "Depot Manager": False, "Depot Staff": False, "Depot Supervisor": False},

    "Transporters (View)": {"Admin": True, "Management": True, "Loader": False, "Depot Manager": True, "Depot Staff": True, "Depot Supervisor": True},
    "Transporters (Create)": {"Admin": True, "Management": True, "Loader": False, "Depot Manager": False, "Depot Staff": False, "Depot Supervisor": False},
    "Transporters (Update)": {"Admin": True, "Management": True, "Loader": False, "Depot Manager": False, "Depot Staff": False, "Depot Supervisor": False},
    "Transporters (Delete)": {"Admin": True, "Management": True, "Loader": False, "Depot Manager": False, "Depot Staff": False, "Depot Supervisor": False},

    "Transporter Users (View)": {"Admin": True, "Management": True, "Loader": False, "Depot Manager": False, "Depot Staff": False, "Depot Supervisor": False},
    "Transporter Users (Create)": {"Admin": True, "Management": True, "Loader": False, "Depot Manager": False, "Depot Staff": False, "Depot Supervisor": False},
    "Transporter Users (Update)": {"Admin": True, "Management": True, "Loader": False, "Depot Manager": False, "Depot Staff": False, "Depot Supervisor": False},
    "Transporter Users (Delete)": {"Admin": True, "Management": True, "Loader": False, "Depot Manager": False, "Depot Staff": False, "Depot Supervisor": False},

    "Products (View)": {"Admin": True, "Management": True, "Loader": False, "Depot Manager": True, "Depot Staff": True, "Depot Supervisor": True},
    "Products (Create)": {"Admin": True, "Management": True, "Loader": False, "Depot Manager": False, "Depot Staff": False, "Depot Supervisor": False},
    "Products (Update)": {"Admin": True, "Management": True, "Loader": False, "Depot Manager": False, "Depot Staff": False, "Depot Supervisor": False},
    "Products (Delete)": {"Admin": True, "Management": True, "Loader": False, "Depot Manager": False, "Depot Staff": False, "Depot Supervisor": False},

    "Depots (View)": {"Admin": True, "Management": True, "Loader": False, "Depot Manager": True, "Depot Staff": True, "Depot Supervisor": True},
    "Depots (Create)": {"Admin": True, "Management": True, "Loader": False, "Depot Manager": False, "Depot Staff": False, "Depot Supervisor": False},
    "Depots (Update)": {"Admin": True, "Management": True, "Loader": False, "Depot Manager": False, "Depot Staff": False, "Depot Supervisor": False},
    "Depots (Delete)": {"Admin": True, "Management": True, "Loader": False, "Depot Manager": False, "Depot Staff": False, "Depot Supervisor": False},

    # Verified Trucks Details
    "Verified Trucks Details (View)": {"Admin": True, "Management": True, "Loader": False, "Depot Manager": True, "Depot Staff": True, "Depot Supervisor": True},
    "Verified Trucks Details (Create)": {"Admin": True, "Management": True, "Loader": False, "Depot Manager": True, "Depot Staff": False, "Depot Supervisor": False},
    "Verified Trucks Details (Update)": {"Admin": True, "Management": True, "Loader": False, "Depot Manager": True, "Depot Staff": False, "Depot Supervisor": False},
    "Verified Trucks Details (Delete)": {"Admin": True, "Management": True, "Loader": False, "Depot Manager": False, "Depot Staff": False, "Depot Supervisor": False},

    "Railway Sidings (View)": {"Admin": True, "Management": True, "Loader": True, "Depot Manager": True, "Depot Staff": True, "Depot Supervisor": True},
    "Railway Sidings (Create)": {"Admin": True, "Management": True, "Loader": False, "Depot Manager": False, "Depot Staff": False, "Depot Supervisor": False},
    "Railway Sidings (Update)": {"Admin": True, "Management": True, "Loader": False, "Depot Manager": False, "Depot Staff": False, "Depot Supervisor": False},
    "Railway Sidings (Delete)": {"Admin": True, "Management": True, "Loader": False, "Depot Manager": False, "Depot Staff": False, "Depot Supervisor": False},

    "Railway Zones (View)": {"Admin": True, "Management": True, "Loader": True, "Depot Manager": True, "Depot Staff": True, "Depot Supervisor": True},
    "Railway Zones (Create)": {"Admin": True, "Management": True, "Loader": False, "Depot Manager": False, "Depot Staff": False, "Depot Supervisor": False},
    "Railway Zones (Update)": {"Admin": True, "Management": True, "Loader": False, "Depot Manager": False, "Depot Staff": False, "Depot Supervisor": False},
    "Railway Zones (Delete)": {"Admin": True, "Management": True, "Loader": False, "Depot Manager": False, "Depot Staff": False, "Depot Supervisor": False},

    # Purchase Orders
    "Purchase Orders (View)": {"Admin": True, "Management": True, "Loader": False, "Depot Manager": False, "Depot Staff": False, "Depot Supervisor": False},
    "Purchase Orders (Create)": {"Admin": True, "Management": True, "Loader": False, "Depot Manager": False, "Depot Staff": False, "Depot Supervisor": False},
    "Purchase Orders (Update)": {"Admin": True, "Management": True, "Loader": False, "Depot Manager": False, "Depot Staff": False, "Depot Supervisor": False},
    "Purchase Orders (Delete)": {"Admin": True, "Management": True, "Loader": False, "Depot Manager": False, "Depot Staff": False, "Depot Supervisor": False},

    # Admin
    "User Management": {"Admin": True, "Management": True, "Loader": False, "Depot Manager": False, "Depot Staff": False, "Depot Supervisor": False},
    "Role Permissions": {"Admin": True, "Management": True, "Loader": False, "Depot Manager": False, "Depot Staff": False, "Depot Supervisor": False},
    "Analytics": {"Admin": True, "Management": True, "Loader": False, "Depot Manager": False, "Depot Staff": False, "Depot Supervisor": False},
}