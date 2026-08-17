from sqlalchemy import Column, Integer, Boolean, DateTime, Float, Text, Index, JSON
from sqlalchemy.dialects.mysql import VARCHAR
from database import Base


class Tenant(Base):
    __tablename__ = 'tenants'
    id = Column(VARCHAR(36), primary_key=True)
    name = Column(VARCHAR(255), nullable=False)
    slug = Column(VARCHAR(100), nullable=False)
    status = Column(VARCHAR(20), default='active')
    subscription_plan = Column(VARCHAR(50))
    branding = Column(JSON)
    feature_flags = Column(JSON)
    created_at = Column(DateTime, nullable=False)
    __table_args__ = (
        Index('uk_slug', 'slug', unique=True),
    )


class User(Base):
    __tablename__ = 'users'
    id = Column(VARCHAR(36), primary_key=True)
    tenant_id = Column(VARCHAR(36), nullable=False)
    name = Column(VARCHAR(255), nullable=False)
    mobile = Column(VARCHAR(20), nullable=False)
    country_code = Column(VARCHAR(5), default='91')
    password = Column(VARCHAR(255), nullable=False)
    role = Column(VARCHAR(50), nullable=False)
    company_id = Column(VARCHAR(36))
    depot_id = Column(VARCHAR(36))
    transporter_id = Column(VARCHAR(36))
    transporter_name = Column(VARCHAR(255))
    email = Column(VARCHAR(255))
    otp_verified = Column(Boolean, default=False)
    password_set = Column(Boolean, default=True)
    is_master_admin = Column(Boolean, default=False)
    assigned_products = Column(JSON)
    assigned_depots = Column(JSON)
    excluded_products = Column(JSON)
    excluded_depots = Column(JSON)
    created_by = Column(VARCHAR(36))
    created_at = Column(DateTime, nullable=False)
    __table_args__ = (
        Index('uk_mobile', 'tenant_id', 'mobile', unique=True),
        Index('idx_role', 'role'),
        Index('idx_company', 'company_id'),
        Index('idx_depot', 'depot_id'),
        Index('idx_transporter', 'transporter_id'),
        Index('idx_tenant', 'tenant_id'),
    )


class OTP(Base):
    __tablename__ = 'otps'
    id = Column(VARCHAR(36), primary_key=True)
    mobile = Column(VARCHAR(20), nullable=False)
    country_code = Column(VARCHAR(5), nullable=False)
    otp_code = Column(VARCHAR(10), nullable=False)
    purpose = Column(VARCHAR(50), nullable=False)
    verified = Column(Boolean, default=False)
    attempts = Column(Integer, default=0)
    created_at = Column(DateTime, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    __table_args__ = (
        Index('idx_mobile_purpose', 'mobile', 'purpose'),
        Index('idx_expires_at', 'expires_at'),
    )


class Company(Base):
    __tablename__ = 'companies'
    id = Column(VARCHAR(36), primary_key=True)
    tenant_id = Column(VARCHAR(36), nullable=False)
    entity_roles = Column(JSON)
    parent_client_id = Column(VARCHAR(36))
    name = Column(VARCHAR(255), nullable=False)
    trade_name = Column(VARCHAR(255))
    logo_file_id = Column(VARCHAR(255))
    location = Column(VARCHAR(255))
    city = Column(VARCHAR(100))
    district = Column(VARCHAR(100))
    state = Column(VARCHAR(100))
    country = Column(VARCHAR(50), default='India')
    pin_code = Column(VARCHAR(10))
    hsn_code = Column(VARCHAR(50))
    product_description = Column(Text)
    gst_applicability = Column(VARCHAR(50))
    gst_number = Column(VARCHAR(50))
    website = Column(VARCHAR(255))
    primary_email = Column(VARCHAR(255))
    secondary_email = Column(VARCHAR(255))
    address = Column(Text)
    landmark = Column(VARCHAR(255))
    emergency_contact = Column(VARCHAR(50))
    whatsapp_number = Column(VARCHAR(50))
    telephone = Column(VARCHAR(50))
    pan_number = Column(VARCHAR(50))
    bank_name = Column(VARCHAR(255))
    bank_account_number = Column(VARCHAR(50))
    ifsc_code = Column(VARCHAR(50))
    contact_person_name = Column(VARCHAR(255))
    contact_person_mobile = Column(VARCHAR(50))
    company_type = Column(VARCHAR(50), default='Client')
    is_client = Column(Boolean, default=False)
    added_on = Column(DateTime)
    added_by = Column(VARCHAR(36))
    users = Column(JSON)
    created_at = Column(DateTime, nullable=False)
    __table_args__ = (
        Index('idx_name', 'name'),
        Index('idx_parent', 'parent_client_id'),
        Index('idx_tenant', 'tenant_id'),
    )


class CompanyUser(Base):
    __tablename__ = 'company_users'
    id = Column(VARCHAR(36), primary_key=True)
    tenant_id = Column(VARCHAR(36), nullable=False)
    company_id = Column(VARCHAR(36), nullable=False)
    name = Column(VARCHAR(255), nullable=False)
    title = Column(VARCHAR(100))
    date_of_birth = Column(VARCHAR(50))
    marital_status = Column(VARCHAR(20))
    date_of_anniversary = Column(VARCHAR(50))
    mobile_number = Column(VARCHAR(50))
    email = Column(VARCHAR(255))
    whatsapp_number = Column(VARCHAR(50))
    emergency_contact = Column(VARCHAR(50))
    address = Column(Text)
    city = Column(VARCHAR(100))
    district = Column(VARCHAR(100))
    state = Column(VARCHAR(100))
    pin_code = Column(VARCHAR(20))
    country = Column(VARCHAR(50), default='India')
    pan_number = Column(VARCHAR(50))
    aadhaar_number = Column(VARCHAR(50))
    photo_url = Column(VARCHAR(255))
    remarks = Column(Text)
    created_at = Column(DateTime, nullable=False)
    __table_args__ = (
        Index('idx_company', 'company_id'),
        Index('idx_tenant', 'tenant_id'),
    )


class Transporter(Base):
    __tablename__ = 'transporters'
    id = Column(VARCHAR(36), primary_key=True)
    tenant_id = Column(VARCHAR(36), nullable=False)
    name = Column(VARCHAR(255), nullable=False)
    trade_name = Column(VARCHAR(255))
    contact_person_name = Column(VARCHAR(255))
    mobile_number = Column(VARCHAR(50))
    email = Column(VARCHAR(255))
    address = Column(Text)
    gst_number = Column(VARCHAR(50))
    industry_type = Column(VARCHAR(100))
    company_ids = Column(JSON)
    users = Column(JSON)
    created_at = Column(DateTime, nullable=False)
    __table_args__ = (
        Index('idx_name', 'name'),
        Index('idx_tenant', 'tenant_id'),
    )


class Truck(Base):
    __tablename__ = 'trucks'
    id = Column(VARCHAR(36), primary_key=True)
    tenant_id = Column(VARCHAR(36), nullable=False)
    vehicle_number = Column(VARCHAR(50), nullable=False)
    transporter_id = Column(VARCHAR(36))
    transporter_name = Column(VARCHAR(255))
    capacity_mt = Column(Float)
    tare_weight_mt = Column(Float)
    driver_name = Column(VARCHAR(255))
    driver_mobile = Column(VARCHAR(50))
    helper_name = Column(VARCHAR(255))
    helper_mobile = Column(VARCHAR(50))
    drivers = Column(JSON)
    current_status = Column(VARCHAR(50), default='Idle')
    front_photo = Column(VARCHAR(255))
    back_photo = Column(VARCHAR(255))
    photos = Column(JSON)
    fitness_certificate = Column(JSON)
    fitness_valid_upto = Column(VARCHAR(50))
    insurance = Column(JSON)
    insurance_valid_upto = Column(VARCHAR(50))
    tax = Column(JSON)
    tax_valid_upto = Column(VARCHAR(50))
    pollution = Column(JSON)
    pollution_valid_upto = Column(VARCHAR(50))
    rc = Column(JSON)
    permit_valid_upto = Column(VARCHAR(50))
    registration_date = Column(VARCHAR(50))
    m_parivaahan = Column(VARCHAR(255))
    driver_license = Column(JSON)
    driver_photo = Column(VARCHAR(255))
    driver_aadhaar = Column(JSON)
    helper1_name = Column(VARCHAR(255))
    helper1_mobile = Column(VARCHAR(50))
    helper1_aadhaar = Column(JSON)
    helper1_photo = Column(VARCHAR(255))
    helper2_name = Column(VARCHAR(255))
    helper2_mobile = Column(VARCHAR(50))
    helper2_aadhaar = Column(JSON)
    helper2_photo = Column(VARCHAR(255))
    created_at = Column(DateTime, nullable=False)
    __table_args__ = (
        Index('uk_vehicle_number', 'tenant_id', 'vehicle_number', unique=True),
        Index('idx_transporter', 'transporter_id'),
        Index('idx_tenant', 'tenant_id'),
    )


class Product(Base):
    __tablename__ = 'products'
    id = Column(VARCHAR(36), primary_key=True)
    tenant_id = Column(VARCHAR(36), nullable=False)
    product_name = Column(VARCHAR(255), nullable=False)
    product_code = Column(VARCHAR(100))
    product_description = Column(Text)
    unit_of_measurement = Column(VARCHAR(20), default='MT')
    category = Column(VARCHAR(100))
    hsn_code = Column(VARCHAR(50))
    assigned_roles = Column(JSON)
    created_at = Column(DateTime, nullable=False)
    __table_args__ = (
        Index('uk_product_code', 'tenant_id', 'product_code', unique=True),
        Index('idx_tenant', 'tenant_id'),
    )


class Depot(Base):
    __tablename__ = 'depots'
    id = Column(VARCHAR(36), primary_key=True)
    tenant_id = Column(VARCHAR(36), nullable=False)
    company_id = Column(VARCHAR(36))
    location_id = Column(VARCHAR(36))
    name = Column(VARCHAR(255), nullable=False)
    location = Column(VARCHAR(255))
    city = Column(VARCHAR(100))
    state = Column(VARCHAR(100))
    address = Column(Text)
    contact_person_name = Column(VARCHAR(255))
    contact_mobile = Column(VARCHAR(50))
    storage_capacity = Column(Float)
    warehouse_type = Column(VARCHAR(100))
    assigned_roles = Column(JSON)
    created_at = Column(DateTime, nullable=False)
    __table_args__ = (
        Index('idx_name', 'name'),
        Index('idx_company', 'company_id'),
        Index('idx_location', 'location_id'),
        Index('idx_tenant', 'tenant_id'),
    )


class DepotInventory(Base):
    __tablename__ = 'depot_inventory'
    id = Column(VARCHAR(36), primary_key=True)
    tenant_id = Column(VARCHAR(36), nullable=False)
    depot_id = Column(VARCHAR(36), nullable=False)
    company_id = Column(VARCHAR(36))
    depot_name = Column(VARCHAR(255), nullable=False)
    product_id = Column(VARCHAR(36), nullable=False)
    product_name = Column(VARCHAR(255), nullable=False)
    product_code = Column(VARCHAR(100))
    total_received = Column(Float, default=0)
    total_dispatched = Column(Float, default=0)
    available_quantity = Column(Float, default=0)
    last_updated = Column(DateTime)
    __table_args__ = (
        Index('uk_depot_product', 'tenant_id', 'depot_id', 'product_id', unique=True),
        Index('idx_product', 'product_id'),
        Index('idx_tenant', 'tenant_id'),
    )


class CompanyInventory(Base):
    __tablename__ = 'company_inventory'
    id = Column(VARCHAR(36), primary_key=True)
    tenant_id = Column(VARCHAR(36), nullable=False)
    company_id = Column(VARCHAR(36), nullable=False)
    company_name = Column(VARCHAR(255), nullable=False)
    product_id = Column(VARCHAR(36), nullable=False)
    product_name = Column(VARCHAR(255), nullable=False)
    product_code = Column(VARCHAR(100))
    total_received = Column(Float, default=0)
    total_dispatched = Column(Float, default=0)
    available_quantity = Column(Float, default=0)
    last_updated = Column(DateTime)
    __table_args__ = (
        Index('uk_company_product', 'tenant_id', 'company_id', 'product_id', unique=True),
        Index('idx_product', 'product_id'),
        Index('idx_tenant', 'tenant_id'),
    )


class DeliveryOrder(Base):
    __tablename__ = 'delivery_orders'
    id = Column(VARCHAR(36), primary_key=True)
    tenant_id = Column(VARCHAR(36), nullable=False)
    transport_mode = Column(VARCHAR(20), default='Road')
    from_company_id = Column(VARCHAR(36))
    from_company_name = Column(VARCHAR(255))
    product_id = Column(VARCHAR(36))
    product_name = Column(VARCHAR(255))
    product_code = Column(VARCHAR(100))
    total_quantity_mt = Column(Float, nullable=False)
    destination_type = Column(VARCHAR(20), default='Depot')
    to_depot_id = Column(VARCHAR(36))
    to_depot_name = Column(VARCHAR(255))
    to_company_id = Column(VARCHAR(36))
    to_company_name = Column(VARCHAR(255))
    loading_siding_id = Column(VARCHAR(36))
    loading_siding_name = Column(VARCHAR(255))
    loading_siding_code = Column(VARCHAR(50))
    destination_siding_id = Column(VARCHAR(36))
    destination_siding_name = Column(VARCHAR(255))
    destination_siding_code = Column(VARCHAR(50))
    remarks = Column(Text)
    do_copy_file_id = Column(VARCHAR(255))
    client_do_number = Column(VARCHAR(100))
    client_do_date = Column(VARCHAR(50))
    do_order_no = Column(VARCHAR(100))
    do_date = Column(DateTime)
    lifted_quantity_mt = Column(Float, default=0)
    remaining_quantity_mt = Column(Float, default=0)
    status = Column(VARCHAR(50), default='Open')
    added_by = Column(VARCHAR(36))
    added_by_name = Column(VARCHAR(255))
    created_at = Column(DateTime, nullable=False)
    __table_args__ = (
        Index('idx_status', 'status'),
        Index('idx_product', 'product_id'),
        Index('idx_to_company', 'to_company_id'),
        Index('idx_to_depot', 'to_depot_id'),
        Index('idx_tenant', 'tenant_id'),
    )


class Lifting(Base):
    __tablename__ = 'liftings'
    id = Column(VARCHAR(36), primary_key=True)
    tenant_id = Column(VARCHAR(36), nullable=False)
    lifting_type = Column(VARCHAR(20), default='Primary')
    transport_mode = Column(VARCHAR(20), default='Road')
    company_id = Column(VARCHAR(36))
    delivery_order_id = Column(VARCHAR(36))
    delivery_order_no = Column(VARCHAR(100))
    product_id = Column(VARCHAR(36))
    product_name = Column(VARCHAR(255))
    product_code = Column(VARCHAR(100))
    quantity_mt = Column(Float, nullable=False)
    loading_point_type = Column(VARCHAR(20), default='Company')
    loading_point_id = Column(VARCHAR(36))
    loading_point_name = Column(VARCHAR(255))
    date_of_loading = Column(DateTime)
    time_of_loading = Column(VARCHAR(50))
    vehicle_id = Column(VARCHAR(36))
    vehicle_number = Column(VARCHAR(50))
    transporter_name = Column(VARCHAR(255))
    driver_name = Column(VARCHAR(255))
    driver_mobile = Column(VARCHAR(50))
    helper_name = Column(VARCHAR(255))
    helper_mobile = Column(VARCHAR(50))
    loading_siding_id = Column(VARCHAR(36))
    loading_siding_name = Column(VARCHAR(255))
    loading_siding_code = Column(VARCHAR(50))
    destination_siding_id = Column(VARCHAR(36))
    destination_siding_name = Column(VARCHAR(255))
    destination_siding_code = Column(VARCHAR(50))
    tare_weight_mt = Column(Float)
    gross_weight_mt = Column(Float)
    net_weight_mt = Column(Float)
    weight_slip = Column(VARCHAR(255))
    unloading_point_type = Column(VARCHAR(20), default='Depot')
    unloading_point_id = Column(VARCHAR(36))
    unloading_point_name = Column(VARCHAR(255))
    purchase_order_id = Column(VARCHAR(36))
    purchase_order_no = Column(VARCHAR(100))
    pickup_id = Column(VARCHAR(36))
    lifting_no = Column(VARCHAR(100))
    loading_status = Column(VARCHAR(50), default='Loaded')
    loaded_by = Column(VARCHAR(36))
    loaded_by_name = Column(VARCHAR(255))
    unloading_status = Column(VARCHAR(50), default='Pending')
    date_of_unloading = Column(DateTime)
    time_of_unloading = Column(VARCHAR(50))
    verified_by = Column(VARCHAR(36))
    verified_by_name = Column(VARCHAR(255))
    verified_at = Column(DateTime)
    rejected_by = Column(VARCHAR(36))
    rejected_by_name = Column(VARCHAR(255))
    rejected_at = Column(DateTime)
    rejection_reason = Column(Text)
    rescheduled_to = Column(VARCHAR(36))
    reschedule_reason = Column(Text)
    reschedule_count = Column(Integer, default=0)
    reschedule_group_id = Column(VARCHAR(36))
    final_verified_by = Column(VARCHAR(36))
    final_verified_by_name = Column(VARCHAR(255))
    final_verified_at = Column(DateTime)
    created_at = Column(DateTime, nullable=False)
    __table_args__ = (
        Index('idx_date_loading', 'date_of_loading'),
        Index('idx_unloading_status', 'unloading_status'),
        Index('idx_product', 'product_id'),
        Index('idx_delivery_order', 'delivery_order_id'),
        Index('idx_purchase_order', 'purchase_order_id'),
        Index('idx_pickup', 'pickup_id'),
        Index('idx_vehicle', 'vehicle_number'),
        Index('idx_tenant', 'tenant_id'),
    )


class Pickup(Base):
    __tablename__ = 'pickups'
    id = Column(VARCHAR(36), primary_key=True)
    tenant_id = Column(VARCHAR(36), nullable=False)
    date = Column(VARCHAR(50))
    truck_number = Column(VARCHAR(50))
    truck_id = Column(VARCHAR(36))
    transporter_id = Column(VARCHAR(36))
    transporter_name = Column(VARCHAR(255))
    company_id = Column(VARCHAR(36))
    company_name = Column(VARCHAR(255))
    estimated_weight_mt = Column(Float)
    driver_phone = Column(VARCHAR(50))
    source_id = Column(VARCHAR(36))
    source_name = Column(VARCHAR(255))
    source_type = Column(VARCHAR(50), default='Depot')
    product_id = Column(VARCHAR(36))
    product_name = Column(VARCHAR(255))
    tare_slip_file_id = Column(VARCHAR(255))
    original_schedule_date = Column(VARCHAR(50))
    reschedule_count = Column(Integer, default=0)
    status = Column(VARCHAR(50), default='scheduled')
    created_at = Column(DateTime, nullable=False)
    loading_start_time = Column(VARCHAR(50))
    loading_end_time = Column(VARCHAR(50))
    purchase_order_id = Column(VARCHAR(36))
    purchase_order_no = Column(VARCHAR(100))
    purchase_order_company_name = Column(VARCHAR(255))
    purchase_order_date = Column(VARCHAR(50))
    purchase_order_company_id = Column(VARCHAR(36))
    lifting_id = Column(VARCHAR(36))
    lifting_no = Column(VARCHAR(100))
    rescheduled_to = Column(VARCHAR(36))
    reschedule_reason = Column(Text)
    reschedule_group_id = Column(VARCHAR(36))
    verified_by = Column(VARCHAR(36))
    verified_by_name = Column(VARCHAR(255))
    verified_at = Column(DateTime)
    # Same names and types as Lifting's rejection block, so the two tables
    # describe the same concept identically.
    rejected_by = Column(VARCHAR(36))
    rejected_by_name = Column(VARCHAR(255))
    rejected_at = Column(DateTime)
    rejection_reason = Column(Text)
    weight_mt = Column(Float)
    weight_slips = Column(JSON)
    loaded_weight_mt = Column(Float)
    weightment_slip_file_id = Column(VARCHAR(255))
    tare_slip_upload_history = Column(JSON)
    weightment_slip_upload_history = Column(JSON)
    final_verified_by = Column(VARCHAR(36))
    final_verified_by_name = Column(VARCHAR(255))
    final_verified_at = Column(DateTime)
    __table_args__ = (
        Index('idx_status', 'status'),
        Index('idx_truck', 'truck_number'),
        Index('idx_company', 'company_id'),
        Index('idx_tenant', 'tenant_id'),
    )


class PurchaseOrder(Base):
    __tablename__ = 'purchase_orders'
    id = Column(VARCHAR(36), primary_key=True)
    tenant_id = Column(VARCHAR(36), nullable=False)
    depot_id = Column(VARCHAR(36))
    depot_name = Column(VARCHAR(255))
    source_id = Column(VARCHAR(36))
    source_name = Column(VARCHAR(255))
    source_type = Column(VARCHAR(50), default='Depot')
    to_company_id = Column(VARCHAR(36))
    to_company_name = Column(VARCHAR(255))
    billing_company_id = Column(VARCHAR(36))
    billing_company_name = Column(VARCHAR(255))
    product_id = Column(VARCHAR(36))
    product_name = Column(VARCHAR(255))
    product_code = Column(VARCHAR(100))
    total_quantity_mt = Column(Float, nullable=False)
    remarks = Column(Text)
    client_po_number = Column(VARCHAR(100))
    client_po_date = Column(VARCHAR(50))
    po_copy_file_id = Column(VARCHAR(255))
    estimated_completion_date = Column(VARCHAR(50))
    po_number = Column(VARCHAR(100))
    po_date = Column(DateTime)
    dispatched_quantity_mt = Column(Float, default=0)
    remaining_quantity_mt = Column(Float, default=0)
    status = Column(VARCHAR(50), default='Open')
    completion_reason = Column(Text)
    actual_completion_date = Column(VARCHAR(50))
    added_by = Column(VARCHAR(36))
    added_by_name = Column(VARCHAR(255))
    created_at = Column(DateTime, nullable=False)
    __table_args__ = (
        Index('idx_status', 'status'),
        Index('idx_product', 'product_id'),
        Index('idx_company', 'to_company_id'),
        Index('idx_source', 'source_id'),
        Index('idx_billing_company', 'billing_company_id'),
        Index('idx_tenant', 'tenant_id'),
    )


class VerifiedTruck(Base):
    __tablename__ = 'verified_trucks'
    id = Column(VARCHAR(36), primary_key=True)
    tenant_id = Column(VARCHAR(36), nullable=False)
    date = Column(VARCHAR(50), nullable=False)
    truck_no = Column(VARCHAR(50), nullable=False)
    transporter = Column(VARCHAR(255))
    driver_mobile = Column(VARCHAR(50))
    company = Column(VARCHAR(255))
    product = Column(VARCHAR(255))
    product_id = Column(VARCHAR(36))
    po_number = Column(VARCHAR(100))
    po_date = Column(VARCHAR(50))
    depot = Column(VARCHAR(255))
    depot_id = Column(VARCHAR(36))
    weight = Column(Float)
    verified_by = Column(VARCHAR(36))
    tare_slip_file_id = Column(VARCHAR(255))
    weightment_slip_file_id = Column(VARCHAR(255))
    invoice_added = Column(Boolean, default=False)
    invoice_details = Column(JSON)
    shipping_added = Column(Boolean, default=False)
    shipping_details = Column(JSON)
    packing_list_added = Column(Boolean, default=False)
    packing_list_details = Column(JSON)
    source = Column(VARCHAR(255))
    source_id = Column(VARCHAR(36))
    source_type = Column(VARCHAR(50))
    pickup_id = Column(VARCHAR(36))
    final_verified_at = Column(DateTime)
    tare_slip_upload_history = Column(JSON)
    weightment_slip_upload_history = Column(JSON)
    created_at = Column(DateTime, nullable=False)
    __table_args__ = (
        Index('idx_date', 'date'),
        Index('idx_truck_no', 'truck_no'),
        Index('idx_pickup', 'pickup_id'),
        Index('idx_tenant', 'tenant_id'),
    )


class Permission(Base):
    __tablename__ = 'permissions'
    id = Column(VARCHAR(36), primary_key=True)
    permissions = Column(JSON)
    updated_at = Column(DateTime)


class RailwayZone(Base):
    __tablename__ = 'railway_zones'
    id = Column(VARCHAR(36), primary_key=True)
    tenant_id = Column(VARCHAR(36), nullable=False)
    country = Column(VARCHAR(50))
    railway_zone = Column(VARCHAR(255))
    zone_code = Column(VARCHAR(50))
    headquarters = Column(VARCHAR(255))
    area_coverage = Column(Text)
    divisions_allotted = Column(Text)
    created_at = Column(DateTime, nullable=False)
    __table_args__ = (
        Index('idx_tenant', 'tenant_id'),
    )


class RailwaySiding(Base):
    __tablename__ = 'railway_sidings'
    id = Column(VARCHAR(36), primary_key=True)
    tenant_id = Column(VARCHAR(36), nullable=False)
    siding_name = Column(VARCHAR(255), nullable=False)
    siding_code = Column(VARCHAR(50))
    location = Column(VARCHAR(255))
    station_name = Column(VARCHAR(255))
    state = Column(VARCHAR(100))
    contact_person_name = Column(VARCHAR(255))
    contact_mobile = Column(VARCHAR(50))
    remarks = Column(Text)
    created_at = Column(DateTime, nullable=False)
    __table_args__ = (
        Index('idx_siding_code', 'siding_code'),
        Index('idx_tenant', 'tenant_id'),
    )


class Report(Base):
    __tablename__ = 'reports'
    id = Column(VARCHAR(36), primary_key=True)
    tenant_id = Column(VARCHAR(36), nullable=False)
    report_type = Column(VARCHAR(100))
    data = Column(JSON)
    created_by = Column(VARCHAR(36))
    created_at = Column(DateTime, nullable=False)


class SourceProduct(Base):
    __tablename__ = 'source_products'
    id = Column(VARCHAR(36), primary_key=True)
    tenant_id = Column(VARCHAR(36), nullable=False)
    source_id = Column(VARCHAR(36), nullable=False)
    source_type = Column(VARCHAR(20), nullable=False)
    product_id = Column(VARCHAR(36), nullable=False)
    active = Column(Boolean, default=True)
    created_by = Column(VARCHAR(36))
    created_at = Column(DateTime, nullable=False)
    __table_args__ = (
        Index('uk_source_product', 'tenant_id', 'source_type', 'source_id', 'product_id', unique=True),
        Index('idx_tenant', 'tenant_id'),
        Index('idx_source', 'source_type', 'source_id'),
        Index('idx_product', 'product_id'),
    )


class ProductOverride(Base):
    __tablename__ = 'product_overrides'
    id = Column(VARCHAR(36), primary_key=True)
    tenant_id = Column(VARCHAR(36), nullable=False)
    company_id = Column(VARCHAR(36), nullable=False)
    product_id = Column(VARCHAR(36), nullable=False)
    code = Column(VARCHAR(100))
    name = Column(VARCHAR(255))
    description = Column(Text)
    min_stock = Column(Float, default=0)
    pricing_model = Column(VARCHAR(50))
    active = Column(Boolean, default=True)
    created_at = Column(DateTime, nullable=False)
    __table_args__ = (
        Index('uk_company_product', 'tenant_id', 'company_id', 'product_id', unique=True),
        Index('idx_tenant', 'tenant_id'),
        Index('idx_product', 'product_id'),
    )


class CompanyPricing(Base):
    __tablename__ = 'company_pricing'
    id = Column(VARCHAR(36), primary_key=True)
    tenant_id = Column(VARCHAR(36), nullable=False)
    company_id = Column(VARCHAR(36), nullable=False)
    product_id = Column(VARCHAR(36), nullable=False)
    tier = Column(VARCHAR(100))
    rate = Column(Float, nullable=False)
    currency = Column(VARCHAR(10), default='INR')
    valid_from = Column(VARCHAR(50))
    valid_to = Column(VARCHAR(50))
    created_at = Column(DateTime, nullable=False)
    __table_args__ = (
        Index('idx_tenant', 'tenant_id'),
        Index('idx_company_product', 'company_id', 'product_id'),
        Index('idx_product', 'product_id'),
    )


class Region(Base):
    __tablename__ = 'regions'
    id = Column(VARCHAR(36), primary_key=True)
    tenant_id = Column(VARCHAR(36), nullable=False)
    name = Column(VARCHAR(255), nullable=False)
    code = Column(VARCHAR(50))
    created_at = Column(DateTime, nullable=False)
    __table_args__ = (
        Index('idx_tenant', 'tenant_id'),
    )


class Location(Base):
    __tablename__ = 'locations'
    id = Column(VARCHAR(36), primary_key=True)
    tenant_id = Column(VARCHAR(36), nullable=False)
    region_id = Column(VARCHAR(36))
    name = Column(VARCHAR(255), nullable=False)
    city = Column(VARCHAR(100))
    state = Column(VARCHAR(100))
    created_at = Column(DateTime, nullable=False)
    __table_args__ = (
        Index('idx_tenant', 'tenant_id'),
        Index('idx_region', 'region_id'),
    )


class ClientOffice(Base):
    __tablename__ = 'client_offices'
    id = Column(VARCHAR(36), primary_key=True)
    tenant_id = Column(VARCHAR(36), nullable=False)
    company_id = Column(VARCHAR(36), nullable=False)
    name = Column(VARCHAR(255), nullable=False)
    office_type = Column(VARCHAR(50), default='Branch')
    is_head_office = Column(Boolean, default=False)
    address = Column(Text)
    city = Column(VARCHAR(100))
    state = Column(VARCHAR(100))
    pin_code = Column(VARCHAR(20))
    contact_person = Column(VARCHAR(255))
    contact_mobile = Column(VARCHAR(50))
    created_at = Column(DateTime, nullable=False)
    __table_args__ = (
        Index('idx_tenant', 'tenant_id'),
        Index('idx_company', 'company_id'),
    )


class ClientFactory(Base):
    __tablename__ = 'client_factories'
    id = Column(VARCHAR(36), primary_key=True)
    tenant_id = Column(VARCHAR(36), nullable=False)
    company_id = Column(VARCHAR(36), nullable=False)
    factory_name = Column(VARCHAR(255), nullable=False)
    address = Column(Text)
    city = Column(VARCHAR(100))
    state = Column(VARCHAR(100))
    product_id = Column(VARCHAR(36), nullable=False)
    created_at = Column(DateTime, nullable=False)
    __table_args__ = (
        Index('uk_company_product', 'tenant_id', 'company_id', 'product_id', unique=True),
        Index('idx_tenant', 'tenant_id'),
        Index('idx_company', 'company_id'),
        Index('idx_product', 'product_id'),
    )
