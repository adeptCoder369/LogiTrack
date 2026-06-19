"""Pydantic models for the application"""
from pydantic import BaseModel, Field, validator
from typing import List, Optional, Union
import uuid
from datetime import datetime, timezone

# ============ OTP MODELS ============

class SendOTPRequest(BaseModel):
    mobile: str
    country_code: str = "91"
    purpose: str = "registration"
    
    @validator('mobile')
    def validate_mobile(cls, v):
        v = ''.join(filter(str.isdigit, v))
        if len(v) != 10:
            raise ValueError("Mobile number must be exactly 10 digits")
        return v

class VerifyOTPRequest(BaseModel):
    mobile: str
    country_code: str = "91"
    otp_code: str
    purpose: str = "registration"

class RegisterRequest(BaseModel):
    name: str
    mobile: str
    country_code: str = "91"
    password: str
    role: str = "Loader"
    email: Optional[str] = None
    depot_id: Optional[str] = None
    company_id: Optional[str] = None
    otp_verified: bool = False

class LoginWithPasswordRequest(BaseModel):
    mobile: str
    country_code: str = "91"
    password: str

class LoginWithOTPRequest(BaseModel):
    mobile: str
    country_code: str = "91"

class FirstTimeSetupRequest(BaseModel):
    mobile: str
    country_code: str = "91"
    otp_code: str
    new_password: str

class AdminCreateUserRequest(BaseModel):
    name: str
    mobile: str
    country_code: str = "91"
    role: str
    company_id: Optional[str] = None
    email: Optional[str] = None
    depot_id: Optional[str] = None
    assigned_products: List[str] = []  # List of product IDs user can access
    assigned_depots: List[str] = []  # List of depot IDs user can access

class UpdateUserProductsRequest(BaseModel):
    assigned_products: List[str] = []  # List of product IDs

class ResetPasswordRequest(BaseModel):
    mobile: str
    country_code: str = "91"
    otp_code: str
    new_password: str

class TokenResponse(BaseModel):
    token: str
    user: dict

class UserRegister(BaseModel):
    name: str
    mobile: str
    country_code: str = "91"
    password: str
    role: str
    email: Optional[str] = None
    depot_id: Optional[str] = None

class UserLogin(BaseModel):
    mobile: str
    country_code: str = "91"
    password: str

# ============ ENTITY MODELS ============

class CompanyBase(BaseModel):
    name: str
    trade_name: Optional[str] = None
    logo_file_id: Optional[str] = None
    location: Optional[str] = None
    city: Optional[str] = None
    district: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = "India"
    pin_code: Optional[str] = None
    hsn_code: Optional[str] = None
    product_description: Optional[str] = None
    gst_applicability: Optional[str] = None
    gst_number: Optional[str] = None
    website: Optional[str] = None
    primary_email: Optional[str] = None
    secondary_email: Optional[str] = None
    address: Optional[str] = None
    landmark: Optional[str] = None
    emergency_contact: Optional[str] = None
    whatsapp_number: Optional[str] = None
    telephone: Optional[str] = None
    pan_number: Optional[str] = None
    bank_name: Optional[str] = None
    bank_account_number: Optional[str] = None
    ifsc_code: Optional[str] = None
    contact_person_name: Optional[str] = None
    contact_person_mobile: Optional[str] = None
    is_client: bool = False  # Auto-set to True when a verified lifting is done for this company

class CompanyCreate(CompanyBase):
    pass

class Company(CompanyBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    added_on: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    added_by: Optional[str] = None
    users: List[dict] = []

class CompanyUserBase(BaseModel):
    name: str
    title: Optional[str] = None
    date_of_birth: Optional[str] = None
    marital_status: Optional[str] = None
    date_of_anniversary: Optional[str] = None
    mobile_number: Optional[str] = None
    email: Optional[str] = None
    whatsapp_number: Optional[str] = None
    emergency_contact: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    district: Optional[str] = None
    state: Optional[str] = None
    pin_code: Optional[str] = None
    country: Optional[str] = "India"
    pan_number: Optional[str] = None
    aadhaar_number: Optional[str] = None
    photo_url: Optional[str] = None
    remarks: Optional[str] = None

class CompanyUserCreate(CompanyUserBase):
    pass

class CompanyUser(CompanyUserBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    company_id: str
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class TransporterBase(BaseModel):
    name: str
    trade_name: Optional[str] = None
    contact_person_name: Optional[str] = None
    mobile_number: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    gst_number: Optional[str] = None
    industry_type: Optional[str] = None
    users: List[dict] = []  # Multiple users under transporter

class TransporterCreate(TransporterBase):
    pass

class Transporter(TransporterBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class DriverInfo(BaseModel):
    name: str
    mobile: Optional[str] = None
    is_primary: bool = False

class TruckBase(BaseModel):
    vehicle_number: str
    transporter_id: Optional[str] = None
    transporter_name: Optional[str] = None
    capacity_mt: Optional[float] = None
    tare_weight_mt: Optional[float] = None
    make_model: Optional[str] = None
    driver_name: Optional[str] = None
    driver_mobile: Optional[str] = None
    helper_name: Optional[str] = None
    helper_mobile: Optional[str] = None
    drivers: Optional[List[dict]] = []
    current_status: Optional[str] = "Idle"
    front_photo: Optional[str] = None
    back_photo: Optional[str] = None
    photos: Optional[List[str]] = []

class TruckCreate(TruckBase):
    pass

class Truck(TruckBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class ProductBase(BaseModel):
    product_name: str
    product_code: Optional[str] = None
    product_description: Optional[str] = None
    unit_of_measurement: Optional[str] = "MT"
    category: Optional[str] = None
    hsn_code: Optional[str] = None
    assigned_roles: List[str] = []

class ProductCreate(ProductBase):
    pass

class Product(ProductBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class DepotBase(BaseModel):
    name: str
    location: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    address: Optional[str] = None
    contact_person_name: Optional[str] = None
    contact_mobile: Optional[str] = None
    storage_capacity: Optional[float] = None
    warehouse_type: Optional[str] = None
    # Assignment fields
    assigned_roles: List[str] = []

class DepotCreate(DepotBase):
    pass

class Depot(DepotBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class DepotInventory(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    depot_id: str
    company_id: str
    depot_name: str
    product_id: str
    product_name: str
    product_code: Optional[str] = None
    total_received: float = 0
    total_dispatched: float = 0
    available_quantity: float = 0
    last_updated: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class InvoiceDetails(BaseModel):
    invoice_no: Optional[str] = None
    invoice_date: Optional[str] = None
    comments: Optional[str] = None
    file_id: Optional[str] = None
    fileName: Optional[str] = None
    invoice_amount: Optional[float] = None
    currency: str = 'INR'


class ShippingDetails(BaseModel):
    shipping_no: Optional[str] = None
    shipping_date: Optional[str] = None
    comments: Optional[str] = None
    file_id: Optional[str] = None
    fileName: Optional[str] = None
    shipping_bill_amount: Optional[float] = None
    currency: str = 'INR'


class PackingListDetails(BaseModel):
    packing_list_no: Optional[str] = None
    packing_list_date: Optional[str] = None
    remarks: Optional[str] = None
    file_id: Optional[str] = None
    fileName: Optional[str] = None


class VerifiedTruckBase(BaseModel):
    date: str
    truck_no: str
    transporter: Optional[str] = None
    driver_mobile: Optional[str] = None
    company: Optional[str] = None
    product: Optional[str] = None
    product_id: Optional[str] = None
    po_number: Optional[str] = None
    po_date: Optional[str] = None
    depot: Optional[str] = None
    depot_id: Optional[str] = None
    weight: Optional[Union[str, float]] = None
    verified_by: Optional[str] = None
    tare_slip_file_id: Optional[str] = None
    weightment_slip_file_id: Optional[str] = None
    invoice_added: bool = False
    invoice_details: Optional[InvoiceDetails] = None
    shipping_added: bool = False
    shipping_details: Optional[ShippingDetails] = None
    packing_list_added: bool = False
    packing_list_details: Optional[PackingListDetails] = None


class VerifiedTruckCreate(VerifiedTruckBase):
    pass


class VerifiedTruck(VerifiedTruckBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class RailwaySidingBase(BaseModel):
    siding_name: str
    siding_code: str
    location: Optional[str] = None
    station_name: Optional[str] = None
    state: Optional[str] = None
    contact_person_name: Optional[str] = None
    contact_mobile: Optional[str] = None
    remarks: Optional[str] = None

class RailwaySidingCreate(RailwaySidingBase):
    pass

class RailwaySiding(RailwaySidingBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class RailwayZoneBase(BaseModel):
    country: str
    railwayZone: str
    zoneCode: str
    headquarters: str
    areaCoverage: Optional[str] = None
    divisionsAllotted: Optional[str] = None

class RailwayZoneCreate(RailwayZoneBase):
    pass

class RailwayZone(RailwayZoneBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class DeliveryOrderBase(BaseModel):
    transport_mode: str = "Road"
    from_company_id: Optional[str] = None
    from_company_name: Optional[str] = None
    product_id: Optional[str] = None
    product_name: Optional[str] = None
    product_code: Optional[str] = None
    total_quantity_mt: float
    destination_type: str = "Depot"
    to_depot_id: Optional[str] = None
    to_depot_name: Optional[str] = None
    to_company_id: Optional[str] = None
    to_company_name: Optional[str] = None
    loading_siding_id: Optional[str] = None
    loading_siding_name: Optional[str] = None
    loading_siding_code: Optional[str] = None
    destination_siding_id: Optional[str] = None
    destination_siding_name: Optional[str] = None
    destination_siding_code: Optional[str] = None
    remarks: Optional[str] = None
    do_copy_file_id: Optional[str] = None
    client_do_number: Optional[str] = None
    client_do_date: Optional[str] = None

class DeliveryOrderCreate(DeliveryOrderBase):
    pass

class DeliveryOrder(DeliveryOrderBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    do_order_no: str = ""
    do_date: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    lifted_quantity_mt: float = 0
    remaining_quantity_mt: float = 0
    status: str = "Open"
    added_by: Optional[str] = None
    added_by_name: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class LiftingBase(BaseModel):
    lifting_type: str = "Primary"
    transport_mode: str = "Road"
    company_id: Optional[str] = None
    delivery_order_id: Optional[str] = None
    delivery_order_no: Optional[str] = None
    product_id: Optional[str] = None
    product_name: Optional[str] = None
    product_code: Optional[str] = None
    quantity_mt: float
    loading_point_type: str = "Company"
    loading_point_id: Optional[str] = None
    loading_point_name: Optional[str] = None
    date_of_loading: Optional[str] = None
    time_of_loading: Optional[str] = None
    vehicle_id: Optional[str] = None
    vehicle_number: Optional[str] = None
    transporter_name: Optional[str] = None
    driver_name: Optional[str] = None
    driver_mobile: Optional[str] = None
    helper_name: Optional[str] = None
    helper_mobile: Optional[str] = None
    loading_siding_id: Optional[str] = None
    loading_siding_name: Optional[str] = None
    loading_siding_code: Optional[str] = None
    destination_siding_id: Optional[str] = None
    destination_siding_name: Optional[str] = None
    destination_siding_code: Optional[str] = None
    tare_weight_mt: Optional[float] = None
    gross_weight_mt: Optional[float] = None
    net_weight_mt: Optional[float] = None
    weight_slip: Optional[str] = None
    unloading_point_type: str = "Depot"
    unloading_point_id: Optional[str] = None
    unloading_point_name: Optional[str] = None
    purchase_order_id: Optional[str] = None
    purchase_order_no: Optional[str] = None

class LiftingCreate(LiftingBase):
    pass

class Lifting(LiftingBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    lifting_no: str = ""
    loading_status: str = "Loaded"
    loaded_by: Optional[str] = None
    loaded_by_name: Optional[str] = None
    unloading_status: str = "Pending"
    date_of_unloading: Optional[str] = None
    time_of_unloading: Optional[str] = None
    verified_by: Optional[str] = None
    verified_by_name: Optional[str] = None
    verified_at: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class VerifyUnloadRequest(BaseModel):
    date_of_unloading: str
    time_of_unloading: str

class PurchaseOrderBase(BaseModel):
    depot_id: str
    depot_name: Optional[str] = None
    
    to_company_id: Optional[str] = None
    to_company_name: Optional[str] = None
    
    product_id: str
    product_name: Optional[str] = None
    product_code: Optional[str] = None
    
    total_quantity_mt: float
    remarks: Optional[str] = None
    client_po_number: Optional[str] = None
    client_po_date: Optional[str] = None
    po_copy_file_id: Optional[str] = None
    estimated_completion_date: Optional[str] = None


class PurchaseOrderCreate(PurchaseOrderBase):
    status: Optional[str] = None


class PurchaseOrder(PurchaseOrderBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    po_number: str = ""
    po_date: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    
    dispatched_quantity_mt: float = 0
    remaining_quantity_mt: float = 0
    
    status: str = "Open"
    completion_reason: Optional[str] = None
    actual_completion_date: Optional[str] = None
    
    added_by: Optional[str] = None
    added_by_name: Optional[str] = None
    
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class PickupBase(BaseModel):
    date: str
    truck_number: str
    truck_id: Optional[str] = None
    transporter_id: Optional[str] = None
    transporter_name: Optional[str] = None
    company_id: Optional[str] = None
    company_name: Optional[str] = None
    estimated_weight_mt: Optional[float] = None
    driver_phone: Optional[str] = None
    depot_id: Optional[str] = None
    depot_name: Optional[str] = None
    product_id: Optional[str] = None
    product_name: Optional[str] = None
    tare_slip_file_id: Optional[str] = None
    original_schedule_date: Optional[str] = None
    reschedule_count: int = 0
    status: str = "scheduled"  # scheduled | loading_started | loaded | weightment_done | final_verified | verified | rescheduled | rejected


class PickupCreate(PickupBase):
    pass


class Pickup(PickupBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

    # loading tracking
    loading_start_time: Optional[str] = None
    loading_end_time: Optional[str] = None

    # purchase order
    purchase_order_id: Optional[str] = None
    purchase_order_no: Optional[str] = None
    purchase_order_company_name: Optional[str] = None
    purchase_order_date: Optional[str] = None

    # reschedule
    rescheduled_to: Optional[str] = None
    reschedule_reason: Optional[str] = None
    original_schedule_date: Optional[str] = None
    reschedule_count: int = 0
    reschedule_group_id: Optional[str] = None

    # verification
    verified_by: Optional[str] = None
    verified_by_name: Optional[str] = None
    verified_at: Optional[str] = None

    weight_mt: Optional[float] = None
    weight_slips: List[str] = []

    # weightment (loaded weight + slip)
    loaded_weight_mt: Optional[float] = None
    weightment_slip_file_id: Optional[str] = None

    # final verification
    final_verified_by: Optional[str] = None
    final_verified_by_name: Optional[str] = None
    final_verified_at: Optional[str] = None