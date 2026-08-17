"""Application configuration"""
import os
from pathlib import Path
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')


def normalize_role_name(role: str | None) -> str | None:
    """Normalize legacy role names to the current UI role label."""
    if not role:
        return role

    normalized = str(role).strip()
    if normalized in {"Depot Manager", "Depot Managers"}:
        return "Weightment"
    if normalized == "Weightment":
        return "Weightment"
    if normalized == "Dispatch Verifier":
        return "Dispatch Verifier"
    if normalized == "Transporter":
        return "Transporter"
    return normalized


def normalize_permission_map(permissions: dict | None) -> dict:
    """Convert legacy permission keys to the current role names."""
    if not permissions:
        return {}

    normalized = {}
    for module, role_map in permissions.items():
        if not isinstance(role_map, dict):
            normalized[module] = role_map
            continue

        normalized[module] = {
            normalize_role_name(role): value
            for role, value in role_map.items()
        }

    return normalized

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
    "Dashboard": {"Admin": True, "Management": True, "Loader": True, "Weightment": True, "Dispatch Verifier": True, "Transporter": True, "Depot Staff": True, "Depot Supervisor": True},

    # Delivery Orders
    "Delivery Orders (View)": {"Admin": True, "Management": True, "Loader": False, "Weightment": False, "Depot Staff": False, "Depot Supervisor": False},
    "Delivery Orders (Create)": {"Admin": True, "Management": True, "Loader": False, "Weightment": False, "Depot Staff": False, "Depot Supervisor": False},
    "Delivery Orders (Update)": {"Admin": True, "Management": True, "Loader": False, "Weightment": False, "Depot Staff": False, "Depot Supervisor": False},
    "Delivery Orders (Delete)": {"Admin": True, "Management": True, "Loader": False, "Weightment": False, "Depot Staff": False, "Depot Supervisor": False},

    # Liftings
    "Liftings (View)": {"Admin": True, "Management": True, "Loader": True, "Weightment": True, "Depot Staff": True, "Depot Supervisor": True},
    "Liftings (Create)": {"Admin": True, "Management": True, "Loader": True, "Weightment": True, "Depot Staff": True, "Depot Supervisor": True},
    "Liftings (Update)": {"Admin": True, "Management": True, "Loader": False, "Weightment": True, "Depot Staff": False, "Depot Supervisor": False},
    "Liftings (Delete)": {"Admin": True, "Management": True, "Loader": False, "Weightment": False, "Depot Staff": False, "Depot Supervisor": False},
    "Primary Liftings (Create)": {"Admin": True, "Management": True, "Loader": True, "Weightment": False, "Depot Staff": False, "Depot Supervisor": False},
    "Secondary Liftings (Create)": {"Admin": True, "Management": True, "Loader": False, "Weightment": True, "Depot Staff": True, "Depot Supervisor": True},

    # Pickups
    # Read-only listing, split out from "Pickup (Execution)" so transporters can
    # see their own pickups (the handler applies build_transporter_filter)
    # without also gaining the four unscoped writes that key gates.
    "Pickups (View)": {"Admin": True, "Management": True, "Loader": True, "Weightment": True, "Transporter": True, "Depot Staff": True, "Depot Supervisor": True},
    "Schedule Pickup": {"Admin": True, "Management": True, "Loader": True, "Weightment": False, "Depot Staff": False, "Depot Supervisor": False},
    "Pickup (Execution)": {"Admin": True, "Management": True, "Loader": True, "Weightment": True, "Depot Staff": True, "Depot Supervisor": True},
    "Verify Pickup": {"Admin": True, "Management": True, "Loader": False, "Weightment": True, "Depot Staff": False, "Depot Supervisor": True},

    # Final dispatch verification
    "Final Dispatch Verification": {"Admin": True, "Management": True, "Loader": False, "Weightment": True, "Dispatch Verifier": True, "Depot Staff": False, "Depot Supervisor": True},

    # Verification (Unloading)
    "Verification (Unloading)": {"Admin": True, "Management": True, "Loader": False, "Weightment": True, "Dispatch Verifier": False, "Depot Staff": False, "Depot Supervisor": True},

    # Wallets
    "Inventory Wallet (View)": {"Admin": True, "Management": True, "Loader": False, "Weightment": True, "Depot Staff": True, "Depot Supervisor": True},
    "DO Wallet (View)": {"Admin": True, "Management": True, "Loader": True, "Weightment": False, "Depot Staff": False, "Depot Supervisor": False},

    # Reports
    "Company Reports": {"Admin": True, "Management": True, "Loader": False, "Weightment": True, "Depot Staff": True, "Depot Supervisor": True},
    "Lifting Reports": {"Admin": True, "Management": True, "Loader": False, "Weightment": True, "Depot Staff": True, "Depot Supervisor": True},

    # Master Data — View (sidebar/route)
    "Trucks (View)": {"Admin": True, "Management": True, "Loader": True, "Weightment": True, "Transporter": True, "Depot Staff": True, "Depot Supervisor": True},
    # Transporters manage their own fleet: create forces the caller's own
    # transporter_id, update/delete go through ensure_transporter_access.
    "Trucks (Create)": {"Admin": True, "Management": True, "Loader": False, "Weightment": False, "Transporter": True, "Depot Staff": False, "Depot Supervisor": False},
    "Trucks (Update)": {"Admin": True, "Management": True, "Loader": False, "Weightment": False, "Transporter": True, "Depot Staff": False, "Depot Supervisor": False},
    "Trucks (Delete)": {"Admin": True, "Management": True, "Loader": False, "Weightment": False, "Transporter": True, "Depot Staff": False, "Depot Supervisor": False},

    "Companies (View)": {"Admin": True, "Management": True, "Loader": False, "Weightment": True, "Depot Staff": True, "Depot Supervisor": True},
    "Companies (Create)": {"Admin": True, "Management": True, "Loader": False, "Weightment": False, "Depot Staff": False, "Depot Supervisor": False},
    "Companies (Update)": {"Admin": True, "Management": True, "Loader": False, "Weightment": False, "Depot Staff": False, "Depot Supervisor": False},
    "Companies (Delete)": {"Admin": True, "Management": True, "Loader": False, "Weightment": False, "Depot Staff": False, "Depot Supervisor": False},

    "Company Users (View)": {"Admin": True, "Management": True, "Loader": False, "Weightment": False, "Depot Staff": False, "Depot Supervisor": False},
    "Company Users (Create)": {"Admin": True, "Management": True, "Loader": False, "Weightment": False, "Depot Staff": False, "Depot Supervisor": False},
    "Company Users (Update)": {"Admin": True, "Management": True, "Loader": False, "Weightment": False, "Depot Staff": False, "Depot Supervisor": False},
    "Company Users (Delete)": {"Admin": True, "Management": True, "Loader": False, "Weightment": False, "Depot Staff": False, "Depot Supervisor": False},

    "Transporters (View)": {"Admin": True, "Management": True, "Loader": False, "Weightment": True, "Dispatch Verifier": False, "Transporter": True, "Depot Staff": True, "Depot Supervisor": True},
    "Transporters (Create)": {"Admin": True, "Management": True, "Loader": False, "Weightment": False, "Dispatch Verifier": False, "Transporter": False, "Depot Staff": False, "Depot Supervisor": False},
    "Transporters (Update)": {"Admin": True, "Management": True, "Loader": False, "Weightment": False, "Dispatch Verifier": False, "Transporter": True, "Depot Staff": False, "Depot Supervisor": False},
    "Transporters (Delete)": {"Admin": True, "Management": True, "Loader": False, "Weightment": False, "Dispatch Verifier": False, "Transporter": False, "Depot Staff": False, "Depot Supervisor": False},

    "Transporter Users (View)": {"Admin": True, "Management": True, "Loader": False, "Weightment": False, "Dispatch Verifier": False, "Transporter": True, "Depot Staff": False, "Depot Supervisor": False},
    # Transporters manage their own staff logins; all three go through
    # ensure_transporter_access, which scopes them to the caller's transporter.
    "Transporter Users (Create)": {"Admin": True, "Management": True, "Loader": False, "Weightment": False, "Dispatch Verifier": False, "Transporter": True, "Depot Staff": False, "Depot Supervisor": False},
    "Transporter Users (Update)": {"Admin": True, "Management": True, "Loader": False, "Weightment": False, "Dispatch Verifier": False, "Transporter": True, "Depot Staff": False, "Depot Supervisor": False},
    "Transporter Users (Delete)": {"Admin": True, "Management": True, "Loader": False, "Weightment": False, "Dispatch Verifier": False, "Transporter": True, "Depot Staff": False, "Depot Supervisor": False},

    "Products (View)": {"Admin": True, "Management": True, "Loader": False, "Weightment": True, "Depot Staff": True, "Depot Supervisor": True},
    "Products (Create)": {"Admin": True, "Management": True, "Loader": False, "Weightment": False, "Depot Staff": False, "Depot Supervisor": False},
    "Products (Update)": {"Admin": True, "Management": True, "Loader": False, "Weightment": False, "Depot Staff": False, "Depot Supervisor": False},
    "Products (Delete)": {"Admin": True, "Management": True, "Loader": False, "Weightment": False, "Depot Staff": False, "Depot Supervisor": False},

    "Depots (View)": {"Admin": True, "Management": True, "Loader": False, "Weightment": True, "Depot Staff": True, "Depot Supervisor": True},
    "Depots (Create)": {"Admin": True, "Management": True, "Loader": False, "Weightment": False, "Depot Staff": False, "Depot Supervisor": False},
    "Depots (Update)": {"Admin": True, "Management": True, "Loader": False, "Weightment": False, "Depot Staff": False, "Depot Supervisor": False},
    "Depots (Delete)": {"Admin": True, "Management": True, "Loader": False, "Weightment": False, "Depot Staff": False, "Depot Supervisor": False},

    # Verified Trucks Details
    "Verified Trucks Details (View)": {"Admin": True, "Management": True, "Loader": False, "Weightment": True, "Depot Staff": True, "Depot Supervisor": True},
    "Verified Trucks Details (Create)": {"Admin": True, "Management": True, "Loader": False, "Weightment": True, "Depot Staff": False, "Depot Supervisor": False},
    "Verified Trucks Details (Update)": {"Admin": True, "Management": True, "Loader": False, "Weightment": True, "Depot Staff": False, "Depot Supervisor": False},
    "Verified Trucks Details (Delete)": {"Admin": True, "Management": True, "Loader": False, "Weightment": False, "Depot Staff": False, "Depot Supervisor": False},

    "Railway Sidings (View)": {"Admin": True, "Management": True, "Loader": True, "Weightment": True, "Depot Staff": True, "Depot Supervisor": True},
    "Railway Sidings (Create)": {"Admin": True, "Management": True, "Loader": False, "Weightment": False, "Depot Staff": False, "Depot Supervisor": False},
    "Railway Sidings (Update)": {"Admin": True, "Management": True, "Loader": False, "Weightment": False, "Depot Staff": False, "Depot Supervisor": False},
    "Railway Sidings (Delete)": {"Admin": True, "Management": True, "Loader": False, "Weightment": False, "Depot Staff": False, "Depot Supervisor": False},

    "Railway Zones (View)": {"Admin": True, "Management": True, "Loader": True, "Weightment": True, "Depot Staff": True, "Depot Supervisor": True},
    "Railway Zones (Create)": {"Admin": True, "Management": True, "Loader": False, "Weightment": False, "Depot Staff": False, "Depot Supervisor": False},
    "Railway Zones (Update)": {"Admin": True, "Management": True, "Loader": False, "Weightment": False, "Depot Staff": False, "Depot Supervisor": False},
    "Railway Zones (Delete)": {"Admin": True, "Management": True, "Loader": False, "Weightment": False, "Depot Staff": False, "Depot Supervisor": False},

    # Purchase Orders
    "Purchase Orders (View)": {"Admin": True, "Management": True, "Loader": False, "Weightment": False, "Depot Staff": False, "Depot Supervisor": False},
    "Purchase Orders (Create)": {"Admin": True, "Management": True, "Loader": False, "Weightment": False, "Depot Staff": False, "Depot Supervisor": False},
    "Purchase Orders (Update)": {"Admin": True, "Management": True, "Loader": False, "Weightment": False, "Depot Staff": False, "Depot Supervisor": False},
    "Purchase Orders (Delete)": {"Admin": True, "Management": True, "Loader": False, "Weightment": False, "Depot Staff": False, "Depot Supervisor": False},

    # Admin
    "User Management": {"Admin": True, "Management": True, "Loader": False, "Weightment": False, "Depot Staff": False, "Depot Supervisor": False},
    "Role Permissions": {"Admin": True, "Management": True, "Loader": False, "Weightment": False, "Depot Staff": False, "Depot Supervisor": False},
    "Analytics": {"Admin": True, "Management": True, "Loader": False, "Weightment": False, "Depot Staff": False, "Depot Supervisor": False},

    # Downloads
    "Downloads (View)": {"Admin": True, "Management": True, "Loader": True, "Weightment": True, "Transporter": True, "Depot Staff": True, "Depot Supervisor": True},
    "Downloads (Create)": {"Admin": True, "Management": True, "Loader": False, "Weightment": False, "Transporter": False, "Depot Staff": False, "Depot Supervisor": False},
    "Downloads (Update)": {"Admin": True, "Management": True, "Loader": False, "Weightment": False, "Transporter": False, "Depot Staff": False, "Depot Supervisor": False},
    "Downloads (Delete)": {"Admin": True, "Management": True, "Loader": False, "Weightment": False, "Transporter": False, "Depot Staff": False, "Depot Supervisor": False},

    # Tenants (platform-level; effective gating is is_master_admin)
    "Tenants (View)": {"Admin": True, "Management": True, "Loader": False, "Weightment": False, "Transporter": False, "Depot Staff": False, "Depot Supervisor": False},
    "Tenants (Create)": {"Admin": True, "Management": True, "Loader": False, "Weightment": False, "Transporter": False, "Depot Staff": False, "Depot Supervisor": False},
    "Tenants (Update)": {"Admin": True, "Management": True, "Loader": False, "Weightment": False, "Transporter": False, "Depot Staff": False, "Depot Supervisor": False},

    # Source Access (Phase 1: source <-> product mapping)
    "Source Access (View)": {"Admin": True, "Management": True, "Loader": False, "Weightment": False, "Transporter": False, "Depot Staff": False, "Depot Supervisor": False},
    "Source Access (Create)": {"Admin": True, "Management": True, "Loader": False, "Weightment": False, "Transporter": False, "Depot Staff": False, "Depot Supervisor": False},
    "Source Access (Update)": {"Admin": True, "Management": True, "Loader": False, "Weightment": False, "Transporter": False, "Depot Staff": False, "Depot Supervisor": False},

    # Locations (Phase 2: region > location > depot hierarchy)
    "Regions (View)": {"Admin": True, "Management": True, "Loader": False, "Weightment": False, "Transporter": False, "Depot Staff": False, "Depot Supervisor": False},
    "Regions (Create)": {"Admin": True, "Management": True, "Loader": False, "Weightment": False, "Transporter": False, "Depot Staff": False, "Depot Supervisor": False},
    "Regions (Update)": {"Admin": True, "Management": True, "Loader": False, "Weightment": False, "Transporter": False, "Depot Staff": False, "Depot Supervisor": False},
    "Regions (Delete)": {"Admin": True, "Management": True, "Loader": False, "Weightment": False, "Transporter": False, "Depot Staff": False, "Depot Supervisor": False},
    "Locations (View)": {"Admin": True, "Management": True, "Loader": False, "Weightment": False, "Transporter": False, "Depot Staff": False, "Depot Supervisor": False},
    "Locations (Create)": {"Admin": True, "Management": True, "Loader": False, "Weightment": False, "Transporter": False, "Depot Staff": False, "Depot Supervisor": False},
    "Locations (Update)": {"Admin": True, "Management": True, "Loader": False, "Weightment": False, "Transporter": False, "Depot Staff": False, "Depot Supervisor": False},
    "Locations (Delete)": {"Admin": True, "Management": True, "Loader": False, "Weightment": False, "Transporter": False, "Depot Staff": False, "Depot Supervisor": False},

    # Leads (Phase 2)
    "Leads (View)": {"Admin": True, "Management": True, "Loader": False, "Weightment": False, "Transporter": False, "Depot Staff": False, "Depot Supervisor": False},
    "Leads (Create)": {"Admin": True, "Management": True, "Loader": False, "Weightment": False, "Transporter": False, "Depot Staff": False, "Depot Supervisor": False},
    "Leads (Update)": {"Admin": True, "Management": True, "Loader": False, "Weightment": False, "Transporter": False, "Depot Staff": False, "Depot Supervisor": False},
    "Leads (Delete)": {"Admin": True, "Management": True, "Loader": False, "Weightment": False, "Transporter": False, "Depot Staff": False, "Depot Supervisor": False},
    "Leads (Convert)": {"Admin": True, "Management": True, "Loader": False, "Weightment": False, "Transporter": False, "Depot Staff": False, "Depot Supervisor": False},

    # Firms (Phase 2)
    "Firms (View)": {"Admin": True, "Management": True, "Loader": False, "Weightment": False, "Transporter": False, "Depot Staff": False, "Depot Supervisor": False},
    "Firms (Create)": {"Admin": True, "Management": True, "Loader": False, "Weightment": False, "Transporter": False, "Depot Staff": False, "Depot Supervisor": False},
    "Firms (Update)": {"Admin": True, "Management": True, "Loader": False, "Weightment": False, "Transporter": False, "Depot Staff": False, "Depot Supervisor": False},
    "Firms (Delete)": {"Admin": True, "Management": True, "Loader": False, "Weightment": False, "Transporter": False, "Depot Staff": False, "Depot Supervisor": False},
}