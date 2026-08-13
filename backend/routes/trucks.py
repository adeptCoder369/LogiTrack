"""Truck routes"""
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from typing import List
import io

# from db_compat import db
from .db_compat import db

from auth_utils import get_current_user, check_permission, build_transporter_filter, ensure_transporter_access, get_download_user
from models import Truck, TruckCreate, DriverInfo

router = APIRouter(tags=["Trucks"])

@router.post("/trucks", response_model=Truck)
async def create_truck(data: TruckCreate, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "Trucks (Create)")
    truck_data = data.model_dump()

    if current_user.get("role") == "Transporter":
        transporter_id = current_user.get("transporter_id")
        if not transporter_id:
            raise HTTPException(status_code=403, detail="Transporter access is not configured")
        truck_data["transporter_id"] = transporter_id
        truck_data["transporter_name"] = current_user.get("transporter_name") or data.transporter_name
    # Initialize drivers array with primary driver if provided
    if truck_data.get('driver_name'):
        truck_data['drivers'] = [{
            'name': truck_data['driver_name'],
            'mobile': truck_data.get('driver_mobile', ''),
            'is_primary': True
        }]
    else:
        truck_data['drivers'] = []
    truck = Truck(**truck_data)
    await db.trucks.insert_one(truck.model_dump())
    return truck

@router.get("/trucks", response_model=List[Truck])
async def get_trucks(current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "Trucks (View)")
    query = build_transporter_filter(current_user)
    trucks = await db.trucks.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return trucks

@router.get("/trucks/{truck_id}", response_model=Truck)
async def get_truck(truck_id: str, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "Trucks (View)")
    truck = await db.trucks.find_one({"id": truck_id}, {"_id": 0})
    if not truck:
        raise HTTPException(status_code=404, detail="Truck not found")

    # Transporter access check - only enforce if truck has transporter_id set
    if current_user.get("role") == "Transporter" and truck.get("transporter_id"):
        await ensure_transporter_access(current_user, truck.get("transporter_id"))

    return truck

@router.put("/trucks/{truck_id}", response_model=Truck)
async def update_truck(truck_id: str, data: TruckCreate, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "Trucks (Update)")

    existing = await db.trucks.find_one({"id": truck_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Truck not found")

    # Transporter access check - only enforce if truck has transporter_id set
    if current_user.get("role") == "Transporter" and existing.get("transporter_id"):
        await ensure_transporter_access(current_user, existing.get("transporter_id"))

    update_data = data.model_dump()
    if current_user.get("role") == "Transporter":
        update_data["transporter_id"] = current_user.get("transporter_id")
        update_data["transporter_name"] = current_user.get("transporter_name") or existing.get("transporter_name")
    # Get existing truck to preserve drivers list
    if existing:
        existing_drivers = existing.get('drivers', [])
        # If driver_name is updated, check if it's a new driver
        if update_data.get('driver_name'):
            driver_exists = any(
                d['name'] == update_data['driver_name'] and d.get('mobile', '') == update_data.get('driver_mobile', '')
                for d in existing_drivers
            )
            if not driver_exists:
                # Add as new driver
                existing_drivers.append({
                    'name': update_data['driver_name'],
                    'mobile': update_data.get('driver_mobile', ''),
                    'is_primary': False
                })
        update_data['drivers'] = existing_drivers
    await db.trucks.update_one({"id": truck_id}, {"$set": update_data})
    return await db.trucks.find_one({"id": truck_id}, {"_id": 0})

@router.post("/trucks/{truck_id}/drivers")
async def add_driver_to_truck(truck_id: str, driver: DriverInfo, current_user: dict = Depends(get_current_user)):
    """Add a new driver to truck's drivers list"""
    await check_permission(current_user, "Trucks (Update)")
    truck = await db.trucks.find_one({"id": truck_id})
    if not truck:
        raise HTTPException(status_code=404, detail="Truck not found")

    # Transporter access check - only enforce if truck has transporter_id set
    if current_user.get("role") == "Transporter" and truck.get("transporter_id"):
        await ensure_transporter_access(current_user, truck.get("transporter_id"))
    
    drivers = truck.get('drivers', [])
    # Check if driver already exists
    driver_exists = any(
        d['name'] == driver.name and d.get('mobile', '') == driver.mobile
        for d in drivers
    )
    if driver_exists:
        return {"message": "Driver already exists", "drivers": drivers}
    
    # Add new driver
    new_driver = {'name': driver.name, 'mobile': driver.mobile or '', 'is_primary': driver.is_primary}
    drivers.append(new_driver)
    
    # If this is primary, update the truck's primary driver fields too
    update_data = {'drivers': drivers}
    if driver.is_primary:
        update_data['driver_name'] = driver.name
        update_data['driver_mobile'] = driver.mobile
    
    await db.trucks.update_one({"id": truck_id}, {"$set": update_data})
    return {"message": "Driver added", "drivers": drivers}

@router.delete("/trucks/{truck_id}/drivers/{driver_mobile}")
async def remove_driver_from_truck(truck_id: str, driver_mobile: str, current_user: dict = Depends(get_current_user)):
    """Remove a driver from truck's drivers list"""
    await check_permission(current_user, "Trucks (Update)")
    truck = await db.trucks.find_one({"id": truck_id})
    if not truck:
        raise HTTPException(status_code=404, detail="Truck not found")

    # Transporter access check - only enforce if truck has transporter_id set
    if current_user.get("role") == "Transporter" and truck.get("transporter_id"):
        await ensure_transporter_access(current_user, truck.get("transporter_id"))

    drivers = truck.get('drivers', [])
    drivers = [d for d in drivers if d.get('mobile', '') != driver_mobile]
    
    await db.trucks.update_one({"id": truck_id}, {"$set": {'drivers': drivers}})
    return {"message": "Driver removed", "drivers": drivers}

@router.delete("/trucks/{truck_id}")
async def delete_truck(truck_id: str, current_user: dict = Depends(get_current_user)):
    await check_permission(current_user, "Trucks (Delete)")
    existing = await db.trucks.find_one({"id": truck_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Truck not found")

    # Transporter access check - only enforce if truck has transporter_id set
    if current_user.get("role") == "Transporter" and existing.get("transporter_id"):
        await ensure_transporter_access(current_user, existing.get("transporter_id"))

    await db.trucks.delete_one({"id": truck_id})
    return {"message": "Truck deleted"}


@router.get("/trucks/{truck_id}/download-driver-gatepass")
async def download_driver_gatepass(truck_id: str, current_user: dict = Depends(get_download_user)):
    """Download driver gatepass template filled with truck driver data"""
    truck = await db.trucks.find_one({"id": truck_id}, {"_id": 0})
    if not truck:
        raise HTTPException(status_code=404, detail="Truck not found")

    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.lib import colors
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.units import inch
        from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image as RLImage
        import PIL.Image
    except ImportError:
        raise HTTPException(status_code=500, detail="PDF export requires reportlab library")

    from pathlib import Path
    UPLOAD_DIR = Path(__file__).parent.parent / "uploads"

    def get_file_path(file_id: str) -> Path:
        return UPLOAD_DIR / file_id

    output = io.BytesIO()
    
    # Consolidate page margins to maximize printable height
    doc = SimpleDocTemplate(
        output,
        pagesize=A4,
        leftMargin=0.4 * inch,
        rightMargin=0.4 * inch,
        topMargin=0.3 * inch,
        bottomMargin=0.3 * inch,
    )
    story = []
    styles = getSampleStyleSheet()

    # Brand Colors
    BRAND_DARK_BLUE = colors.HexColor("#002D62")
    BRAND_LIGHT_BLUE = colors.HexColor("#00B4D8")
    TEXT_GRAY = colors.HexColor("#333333")

    # Highly compact typography for single-page enforcement
    normal_style = ParagraphStyle('Normal', parent=styles['Normal'], fontSize=9, leading=12, textColor=TEXT_GRAY)
    bold_style = ParagraphStyle('Bold', parent=styles['Normal'], fontSize=9, leading=12, fontName='Helvetica-Bold', textColor=colors.black)
    
    # -------------------------------------------------------------
    # HEADER / COMPANY BRANDING
    # -------------------------------------------------------------
    header_banner_path = UPLOAD_DIR / "header_banner.jpeg"
    
    if header_banner_path.exists():
        # Option A: Use existing high-res banner image scaled perfectly
        try:
            with PIL.Image.open(str(header_banner_path)) as img:
                img_w, img_h = img.size
                target_width = 7.27 * inch
                target_height = (img_h / img_w) * target_width
                banner_img = RLImage(str(header_banner_path), width=target_width, height=target_height)
                story.append(banner_img)
        except Exception:
            header_banner_path = None  # Fallback to programmatic layout if image fails to load
            
    if not header_banner_path or not header_banner_path.exists():
        # Option B: Programmatic Fallback Layout
        
        # 1. Top Decorative Bar
        top_bar_data = [['', '']]
        top_bar_table = Table(top_bar_data, colWidths=[3.2 * inch, 4.07 * inch], rowHeights=[7])
        top_bar_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, 0), BRAND_LIGHT_BLUE),
            ('BACKGROUND', (1, 0), (1, 0), BRAND_DARK_BLUE),
            ('TOPPADDING', (0, 0), (-1, -1), 0),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
        ]))
        story.append(top_bar_table)
        story.append(Spacer(1, 0.04 * inch))

        # Typography for Programmatic Header Text
        company_name_style = ParagraphStyle(
            'HeaderCompanyName',
            parent=styles['Normal'],
            fontName='Helvetica-Oblique',
            fontSize=16,
            leading=18,
            textColor=BRAND_DARK_BLUE
        )
        meta_label_style = ParagraphStyle(
            'HeaderMetaLabel',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=7.5,
            leading=9.5,
            textColor=BRAND_DARK_BLUE
        )
        address_style = ParagraphStyle(
            'HeaderAddress',
            parent=styles['Normal'],
            fontName='Helvetica-Bold',
            fontSize=7.5,
            leading=9.5,
            textColor=BRAND_DARK_BLUE,
            alignment=1  # Centered
        )

        # 2. Logo & Info Block Table
        logo_text = "<font size='22' color='#00B4D8'><b>info</b></font> <font size='20' color='#002D62'><b>EIGHT</b></font>"
        logo_paragraph = Paragraph(logo_text, styles['Normal'])
        company_paragraph = Paragraph("InfoInfinity Ventures Private Limited", company_name_style)
        
        info_grid_data = [
            [
                Paragraph("<b>Tel:</b> (+91) 9674280000", meta_label_style),
                Paragraph("<b>Email:</b> contact@infoeight.com", meta_label_style),
                Paragraph("<b>Web:</b> www.infoeight.com", meta_label_style)
            ],
            [
                Paragraph("<b>CIN:</b> U62099WB2023PT265478", meta_label_style),
                Paragraph("", meta_label_style),
                Paragraph("<b>GSTIN:</b> 19AAHCI3393Q1ZP", meta_label_style)
            ]
        ]
        info_grid_table = Table(info_grid_data, colWidths=[1.6 * inch, 1.8 * inch, 1.6 * inch])
        info_grid_table.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('BOTTOMPADDING', (0,0), (-1,-1), 1),
            ('TOPPADDING', (0,0), (-1,-1), 1),
            ('LEFTPADDING', (0,0), (-1,-1), 0),
            ('RIGHTPADDING', (0,0), (-1,-1), 0),
        ]))

        header_main_data = [
            [logo_paragraph, company_paragraph],
            ['', info_grid_table]
        ]
        header_main_table = Table(header_main_data, colWidths=[2.2 * inch, 5.07 * inch])
        header_main_table.setStyle(TableStyle([
            ('SPAN', (0, 0), (0, 1)),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 1),
            ('TOPPADDING', (0, 0), (-1, -1), 1),
            ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ]))
        story.append(header_main_table)
        story.append(Spacer(1, 0.03 * inch))

        # 3. Bottom Centered Address Bar
        address_text = "<b>Location:</b> Unit-10, 17th Floor, Aurora Waterfront, Sector V, Salt Lake City, Kolkata – 700091, West Bengal, INDIA"
        address_table = Table([[Paragraph(address_text, address_style)]], colWidths=[7.27 * inch])
        address_table.setStyle(TableStyle([
            ('LINEBELOW', (0, 0), (-1, -1), 1.2, BRAND_DARK_BLUE),
            ('TOPPADDING', (0, 0), (-1, -1), 2),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
        ]))
        story.append(address_table)
    
    story.append(Spacer(1, 0.08 * inch))
    
    # -------------------------------------------------------------
    # DRIVER PHOTO (Top right, aligned with To block)
    # -------------------------------------------------------------
    driver_photo = truck.get("driver_photo")
    
    # Initialize with placeholder
    placeholder_text = Paragraph("Paste a passport size\n35 × 45 mm (3.5 × 4.5 cm\nor 1.38 × 1.77 inches)", normal_style)
    photo_placeholder = Table([[placeholder_text]], colWidths=[1.0 * inch], rowHeights=[1.2 * inch])
    photo_placeholder.setStyle(TableStyle([
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor("#000000")),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    
    if driver_photo:
        driver_photo_path = get_file_path(driver_photo)
        if driver_photo_path.exists():
            try:
                with PIL.Image.open(str(driver_photo_path)) as im:
                    iw, ih = im.size
                    ratio = min(1.0 * inch / iw, 1.0 * inch / ih)
                    w, h = iw * ratio, ih * ratio
                    photo_img = RLImage(str(driver_photo_path))
                    photo_img.drawWidth = w
                    photo_img.drawHeight = h
                    photo_placeholder = Table([[photo_img]], colWidths=[1.0 * inch], rowHeights=[1.2 * inch])
                    photo_placeholder.setStyle(TableStyle([
                        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor("#000000")),
                        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                    ]))
            except Exception:
                pass
    
    # To block and Photo side by side
    to_data = [
        [Paragraph("To,<br/>The Commandant (CISF),<br/>MTPS Unit, DVC, MTPS,<br/>Bankura (W.B) - 722183", normal_style), photo_placeholder],
    ]
    to_table = Table(to_data, colWidths=[5.27 * inch, 2.0 * inch])
    to_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
        ('TOPPADDING', (0, 0), (-1, -1), 0),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
    ]))
    story.append(to_table)
    story.append(Spacer(1, 0.05 * inch))
    story.append(Spacer(1, 0.08 * inch))
    
    # Subject & Reference
    story.append(Paragraph("<b>Subject:</b> Request for issuing of temporary gate pass for 14 days", normal_style))
    pass_validity_style = ParagraphStyle('PassValidity', parent=normal_style, spaceBefore=6, spaceAfter=6)
    story.append(Paragraph("<b>Pass Validity:</b><br/>From _____________ to _____________", pass_validity_style))
    story.append(Paragraph("<b>Purpose of Work:</b> Lifting of Gypsum from FGD of #Unit 4-8 of MTPS DVC", normal_style))
    story.append(Paragraph("<b>Reference LOA No.:</b> MT/SE(E)/EMPC/E-auction (Gypsum)/300", normal_style))
    story.append(Paragraph("<b>Reference LOA Date:</b> 20.05.2026", normal_style))
    story.append(Paragraph("<b>Police Verification Status:</b> Not done", normal_style))
    story.append(Paragraph("<b>Access Gate:</b> Gate no. 5", normal_style))
    story.append(Paragraph("<b>Access Timing:</b> Sundays and Holidays included, round the clock basis", normal_style))
    story.append(Spacer(1, 0.08 * inch))
    
    story.append(Paragraph("Respected Sir,", normal_style))
    story.append(Spacer(1, 0.08 * inch))
    story.append(Paragraph("We request you to issue a temporary vehicle gate pass to the following driver for the purpose mentioned above.", normal_style))
    story.append(Spacer(1, 0.15 * inch))
    
    story.append(Paragraph("<b>The details of the driver are as follows:</b>", bold_style))
    story.append(Spacer(1, 0.08 * inch))

    # Vehicle & Driver Details Table
    driver_data = [
        ["VEHICLE REGISTRATION NO.", truck.get('vehicle_number') or ''],
        ["INSURANCE VALID UPTO", truck.get('insurance_valid_upto') or ''],
        ["TAX VALID UPTO", truck.get('tax_valid_upto') or ''],
        ["PUC VALID UPTO", truck.get('pollution_valid_upto') or ''],
        ["FITNESS VALID UPTO", truck.get('fitness_valid_upto') or ''],
        ["DESIGNATION", "Driver"],
        ["DRIVER'S NAME", truck.get('driver_name') or ''],
        ["DRIVER FATHER'S NAME", ''],
        ["DL NO.", ''],
        ["DL VALID UPTO", ''],
        ["AADHAAR NO.", ''],
        ["ADDRESS", ''],
    ]
    
    driver_table = Table(
        [[Paragraph(label, bold_style), Paragraph(value, normal_style)] for label, value in driver_data],
        colWidths=[2.5 * inch, 3.5 * inch],
        rowHeights=[0.26 * inch] * len(driver_data)
    )
    driver_table.setStyle(TableStyle([
        ('BOX', (0, 0), (-1, -1), 1, colors.black),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.black),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING', (0, 0), (-1, -1), 4),
        ('RIGHTPADDING', (0, 0), (-1, -1), 4),
        ('TOPPADDING', (0, 0), (-1, -1), 2),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
    ]))
    story.append(driver_table)
    story.append(Spacer(1, 0.1 * inch))
    
    story.append(Paragraph("Request you to kindly issue the same. This is certified that the identity of the person and attached documents have been verified from our end.", normal_style))
    story.append(Spacer(1, 0.1 * inch))
    story.append(Paragraph("Thanks and Best Regards ,<br/>Piyush Jalan<br/>Director", normal_style))
    
#     # Director Signature Image
#     director_sig_path = UPLOAD_DIR / "director_signature.jpeg"
#     if director_sig_path.exists():
#         try:
#             with PIL.Image.open(str(director_sig_path)) as im:
#                 iw, ih = im.size
#                 ratio = min(2.0 * inch / iw, 0.8 * inch / ih)\n                w, h = iw * ratio, ih * ratio
#                 sig_img = RLImage(str(director_sig_path))
#                 sig_img.drawWidth = w
#                 sig_img.drawHeight = h
#                 sig_table = Table([[sig_img]], colWidths=[3.5 * inch])
# \n                sig_table.setStyle(TableStyle([
#                     ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
#                 ]))
#                 story.append(Spacer(1, 0.05 * inch))\n                story.append(sig_table)
#         except Exception:
#             pass
# Director Signature Image
    director_sig_path = UPLOAD_DIR / "director_signature.jpeg"
    if director_sig_path.exists():
        try:
            with PIL.Image.open(str(director_sig_path)) as im:
                iw, ih = im.size
                ratio = min(2.0 * inch / iw, 0.8 * inch / ih)
                w, h = iw * ratio, ih * ratio
                sig_img = RLImage(str(director_sig_path))
                sig_img.drawWidth = w
                sig_img.drawHeight = h
                sig_table = Table([[sig_img]], colWidths=[3.5 * inch])
                sig_table.setStyle(TableStyle([
                    ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ]))
                story.append(Spacer(1, 0.05 * inch))
                story.append(sig_table)
        except Exception:
            pass
    
    doc.build(story)
    output.seek(0)

    filename = f"driver_gatepass_{truck.get('vehicle_number', truck_id)}.pdf"
    return StreamingResponse(
        output,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/trucks/{truck_id}/download-helper-gatepass")
async def download_helper_gatepass(truck_id: str, current_user: dict = Depends(get_download_user)):
    """Download helper gatepass template filled with truck helper data"""
    truck = await db.trucks.find_one({"id": truck_id}, {"_id": 0})
    if not truck:
        raise HTTPException(status_code=404, detail="Truck not found")

    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.lib import colors
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.units import inch
        from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image as RLImage
        import PIL.Image
    except ImportError:
        raise HTTPException(status_code=500, detail="PDF export requires reportlab library")

    from pathlib import Path
    UPLOAD_DIR = Path(__file__).parent.parent / "uploads"

    def get_file_path(file_id: str) -> Path:
        return UPLOAD_DIR / file_id

    output = io.BytesIO()
    
    # Consolidate page margins to maximize single-page height
    doc = SimpleDocTemplate(
        output,
        pagesize=A4,
        leftMargin=0.4 * inch,
        rightMargin=0.4 * inch,
        topMargin=0.3 * inch,
        bottomMargin=0.3 * inch,
    )
    story = []
    styles = getSampleStyleSheet()

    # Brand Colors
    BRAND_DARK_BLUE = colors.HexColor("#002D62")
    BRAND_LIGHT_BLUE = colors.HexColor("#00B4D8")
    TEXT_GRAY = colors.HexColor("#333333")

    # Compact typography to prevent overflow
    normal_style = ParagraphStyle('Normal', parent=styles['Normal'], fontSize=9.5, leading=12.5, textColor=TEXT_GRAY)
    bold_style = ParagraphStyle('Bold', parent=styles['Normal'], fontSize=9.5, leading=12.5, fontName='Helvetica-Bold', textColor=colors.black)
    
    # -------------------------------------------------------------
    # HEADER / COMPANY BRANDING
    # -------------------------------------------------------------
    header_banner_path = UPLOAD_DIR / "header_banner.jpeg"
    
    if header_banner_path.exists():
        # Option A: Use existing high-res banner image scaled perfectly
        try:
            with PIL.Image.open(str(header_banner_path)) as img:
                img_w, img_h = img.size
                target_width = 7.27 * inch
                target_height = (img_h / img_w) * target_width
                banner_img = RLImage(str(header_banner_path), width=target_width, height=target_height)
                story.append(banner_img)
        except Exception:
            header_banner_path = None  # Fallback to programmatic layout if image fails to load
            
    if not header_banner_path or not header_banner_path.exists():
        # Option B: Programmatic Fallback Layout
        
        # 1. Top Decorative Bar
        top_bar_data = [['', '']]
        top_bar_table = Table(top_bar_data, colWidths=[3.2 * inch, 4.07 * inch], rowHeights=[8])
        top_bar_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, 0), BRAND_LIGHT_BLUE),
            ('BACKGROUND', (1, 0), (1, 0), BRAND_DARK_BLUE),
            ('TOPPADDING', (0, 0), (-1, -1), 0),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
        ]))
        story.append(top_bar_table)
        story.append(Spacer(1, 0.05 * inch))

        # Typography for Programmatic Header Text
        company_name_style = ParagraphStyle(
            'HeaderCompanyName',
            parent=styles['Normal'],
            fontName='Helvetica-Oblique',
            fontSize=17,
            leading=19,
            textColor=BRAND_DARK_BLUE
        )
        meta_label_style = ParagraphStyle(
            'HeaderMetaLabel',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=7.5,
            leading=9.5,
            textColor=BRAND_DARK_BLUE
        )
        address_style = ParagraphStyle(
            'HeaderAddress',
            parent=styles['Normal'],
            fontName='Helvetica-Bold',
            fontSize=8,
            leading=10,
            textColor=BRAND_DARK_BLUE,
            alignment=1  # Centered
        )

        # 2. Logo & Info Block Table
        logo_text = "<font size='24' color='#00B4D8'><b>info</b></font> <font size='22' color='#002D62'><b>EIGHT</b></font>"
        logo_paragraph = Paragraph(logo_text, styles['Normal'])
        company_paragraph = Paragraph("InfoInfinity Ventures Private Limited", company_name_style)
        
        info_grid_data = [
            [
                Paragraph("<b>Tel:</b> (+91) 9674280000", meta_label_style),
                Paragraph("<b>Email:</b> contact@infoeight.com", meta_label_style),
                Paragraph("<b>Web:</b> www.infoeight.com", meta_label_style)
            ],
            [
                Paragraph("<b>CIN:</b> U62099WB2023PT265478", meta_label_style),
                Paragraph("", meta_label_style),
                Paragraph("<b>GSTIN:</b> 19AAHCI3393Q1ZP", meta_label_style)
            ]
        ]
        info_grid_table = Table(info_grid_data, colWidths=[1.6 * inch, 1.8 * inch, 1.6 * inch])
        info_grid_table.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('BOTTOMPADDING', (0,0), (-1,-1), 1),
            ('TOPPADDING', (0,0), (-1,-1), 1),
            ('LEFTPADDING', (0,0), (-1,-1), 0),
            ('RIGHTPADDING', (0,0), (-1,-1), 0),
        ]))

        header_main_data = [
            [logo_paragraph, company_paragraph],
            ['', info_grid_table]
        ]
        header_main_table = Table(header_main_data, colWidths=[2.2 * inch, 5.07 * inch])
        header_main_table.setStyle(TableStyle([
            ('SPAN', (0, 0), (0, 1)),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
            ('TOPPADDING', (0, 0), (-1, -1), 1),
            ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ]))
        story.append(header_main_table)
        story.append(Spacer(1, 0.04 * inch))

        # 3. Bottom Centered Address Bar
        address_text = "<font size='6'>Location:</font> Unit-10, 17th Floor, Aurora Waterfront, Sector V, Salt Lake City, Kolkata – 700091, West Bengal, INDIA"
        address_table = Table([[Paragraph(address_text, address_style)]], colWidths=[7.27 * inch])
        address_table.setStyle(TableStyle([
            ('LINEBELOW', (0, 0), (-1, -1), 1.2, BRAND_DARK_BLUE),
            ('TOPPADDING', (0, 0), (-1, -1), 2),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
        ]))
        story.append(address_table)
    
    story.append(Spacer(1, 0.08 * inch))
    
    # -------------------------------------------------------------
    # HELPER PHOTO (Top right, aligned with To block)
    # -------------------------------------------------------------
    helper_photo = truck.get("helper1_photo")
    
    # Empty placeholder table with no visible border
    empty_cell = Paragraph("", normal_style)
    helper_photo_placeholder = Table([[empty_cell]], colWidths=[1.5 * inch], rowHeights=[1.2 * inch])
    
    if helper_photo:
        helper_photo_path = get_file_path(helper_photo)
        if helper_photo_path.exists():
            try:
                with PIL.Image.open(str(helper_photo_path)) as im:
                    iw, ih = im.size
                    ratio = min(1.1 * inch / iw, 1.1 * inch / ih)
                    w, h = iw * ratio, ih * ratio
                    photo_img = RLImage(str(helper_photo_path))
                    photo_img.drawWidth = w
                    photo_img.drawHeight = h
                    helper_photo_placeholder = Table([[photo_img]], colWidths=[1.5 * inch], rowHeights=[1.2 * inch])
                    helper_photo_placeholder.setStyle(TableStyle([
                        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor("#000000")),
                        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                    ]))
            except Exception:
                pass
    
    # To block and Photo side by side
    to_data = [
        [Paragraph("To,<br/>The Commandant (CISF),<br/>MTPS Unit, DVC, MTPS,<br/>Bankura (W.B) - 722183", normal_style), helper_photo_placeholder],
    ]
    to_table = Table(to_data, colWidths=[5.27 * inch, 2.0 * inch])
    to_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
        ('TOPPADDING', (0, 0), (-1, -1), 0),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
    ]))
    story.append(to_table)
    story.append(Spacer(1, 0.05 * inch))
    story.append(Spacer(1, 0.08 * inch))
    
    # Subject & Reference
    story.append(Paragraph("<b>Subject:</b> Request for issuing of temporary gate pass for 14 days", normal_style))
    pass_validity_style = ParagraphStyle('PassValidity', parent=normal_style, spaceBefore=6, spaceAfter=6)
    story.append(Paragraph("<b>Pass Validity:</b><br/>From _____________ to _____________", pass_validity_style))
    story.append(Paragraph("<b>Purpose of Work:</b> Lifting of Gypsum from FGD of #Unit 4-8 of MTPS DVC", normal_style))
    story.append(Paragraph("<b>Reference LOA No.:</b> MT/SE(E)/EMPC/E-auction (Gypsum)/300", normal_style))
    story.append(Paragraph("<b>Reference LOA Date:</b> 20.05.2026", normal_style))
    story.append(Paragraph("<b>Police Verification Status:</b> Not done", normal_style))
    story.append(Paragraph("<b>Access Gate:</b> Gate no. 5", normal_style))
    story.append(Paragraph("<b>Access Timing:</b> Sundays and Holidays included, round the clock basis", normal_style))
    story.append(Spacer(1, 0.08 * inch))
    
    story.append(Paragraph("Respected Sir,", normal_style))
    story.append(Spacer(1, 0.04 * inch))
    story.append(Paragraph("We request you to issue a temporary vehicle gate pass to the following helper for the purpose mentioned above.", normal_style))
    story.append(Spacer(1, 0.08 * inch))
    
    story.append(Paragraph("<b>The details of the helper are as follows:</b>", bold_style))
    story.append(Spacer(1, 0.06 * inch))

    # Vehicle & Helper Details Table
    helper_data = [
        ["VEHICLE REGISTRATION NO.", truck.get('vehicle_number') or ''],
        ["INSURANCE VALID UPTO", truck.get('insurance_valid_upto') or ''],
        ["TAX VALID UPTO", truck.get('tax_valid_upto') or ''],
        ["PUC VALID UPTO", truck.get('pollution_valid_upto') or ''],
        ["FITNESS VALID UPTO", truck.get('fitness_valid_upto') or ''],
        ["DESIGNATION", "Helper (Khalasi)"],
        ["HELPER'S NAME", truck.get('helper1_name') or ''],
        ["HELPER FATHER'S NAME", ''],
        ["AADHAAR NO.", ''],
        ["ADDRESS", ''],
    ]
    
    helper_table = Table(
        [[Paragraph(label, bold_style), Paragraph(value, normal_style)] for label, value in helper_data],
        colWidths=[2.5 * inch, 3.5 * inch],
        rowHeights=[0.26 * inch] * len(helper_data)
    )
    helper_table.setStyle(TableStyle([
        ('BOX', (0, 0), (-1, -1), 1, colors.black),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.black),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING', (0, 0), (-1, -1), 4),
        ('RIGHTPADDING', (0, 0), (-1, -1), 4),
        ('TOPPADDING', (0, 0), (-1, -1), 2),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
    ]))
    story.append(helper_table)
    story.append(Spacer(1, 0.1 * inch))
    story.append(Paragraph("Request you to kindly issue the same. This is certified that the identity of the person and attached documents have been verified from our end.", normal_style))
    story.append(Spacer(1, 0.1 * inch))
    story.append(Paragraph("Thanks and Best Regards ,<br/>Piyush Jalan<br/>Director", normal_style))
    
# Director Signature Image
    director_sig_path = UPLOAD_DIR / "director_signature.jpeg"
    if director_sig_path.exists():
        try:
            with PIL.Image.open(str(director_sig_path)) as im:
                iw, ih = im.size
                ratio = min(2.0 * inch / iw, 0.8 * inch / ih)
                w, h = iw * ratio, ih * ratio
                sig_img = RLImage(str(director_sig_path))
                sig_img.drawWidth = w
                sig_img.drawHeight = h
                sig_table = Table([[sig_img]], colWidths=[3.5 * inch])
                sig_table.setStyle(TableStyle([
                    ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ]))
                story.append(Spacer(1, 0.05 * inch))
                story.append(sig_table)
        except Exception:
            pass
    
    doc.build(story)
    output.seek(0)

    filename = f"helper_gatepass_{truck.get('vehicle_number', truck_id)}.pdf"
    return StreamingResponse(
        output,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/trucks/{truck_id}/download-documents")
async def download_truck_documents(truck_id: str, current_user: dict = Depends(get_download_user)):
    """Download all truck documents as merged PDF with professional formatting"""
    truck = await db.trucks.find_one({"id": truck_id}, {"_id": 0})
    if not truck:
        raise HTTPException(status_code=404, detail="Truck not found")

    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.lib import colors
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.units import inch
        from reportlab.platypus import (
            SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer,
            Image as RLImage, PageBreak, KeepTogether, HRFlowable
        )
        import PIL.Image
    except ImportError:
        raise HTTPException(status_code=500, detail="PDF export requires reportlab library")

    from pathlib import Path

    UPLOAD_DIR = Path(__file__).parent.parent / "uploads"

    def get_file_path(file_id: str) -> Path:
        return UPLOAD_DIR / file_id

    def get_file_ids(value) -> List[str]:
        """Extract file IDs from document value (handles both formats)"""
        if isinstance(value, dict):
            return [v for v in [value.get("front"), value.get("back")] if v]
        elif isinstance(value, str) and value.strip():
            return [value]
        return []

    # ==================== DESIGN SYSTEM ====================
    INK = colors.HexColor('#111827')          # primary text
    SUBTLE = colors.HexColor('#6B7280')        # secondary text
    FAINT = colors.HexColor('#9CA3AF')         # tertiary text / placeholders
    BORDER = colors.HexColor('#E5E7EB')        # hairline borders
    CARD_BG = colors.HexColor('#F9FAFB')       # card background
    ACCENT = colors.HexColor('#4F46E5')        # indigo accent
    ACCENT_SOFT = colors.HexColor('#EEF2FF')   # soft indigo background
    SUCCESS = colors.HexColor('#059669')       # green
    SUCCESS_SOFT = colors.HexColor('#ECFDF5')
    PENDING = colors.HexColor('#D97706')       # amber
    WHITE = colors.white

    output = io.BytesIO()
    doc = SimpleDocTemplate(
        output,
        pagesize=A4,
        leftMargin=0.35 * inch,
        rightMargin=0.35 * inch,
        topMargin=0.35 * inch,
        bottomMargin=0.35 * inch,
    )
    story = []
    styles = getSampleStyleSheet()

    # ---------- Typography ----------
    eyebrow_style = ParagraphStyle(
        'Eyebrow', parent=styles['Normal'], fontSize=8.5, fontName='Helvetica-Bold',
        textColor=ACCENT, leading=11, spaceAfter=2, tracking=1,
    )
    doc_title_style = ParagraphStyle(
        'DocTitle', parent=styles['Normal'], fontSize=20, fontName='Helvetica-Bold',
        textColor=INK, leading=24,
    )
    doc_subtitle_style = ParagraphStyle(
        'DocSubtitle', parent=styles['Normal'], fontSize=9.5, fontName='Helvetica',
        textColor=SUBTLE, leading=13,
    )
    section_header_style = ParagraphStyle(
        'SectionHeader', parent=styles['Normal'], fontSize=10.5, fontName='Helvetica-Bold',
        textColor=INK, leading=14,
    )
    section_sub_style = ParagraphStyle(
        'SectionSub', parent=styles['Normal'], fontSize=8, fontName='Helvetica',
        textColor=SUBTLE, leading=11,
    )
    label_style = ParagraphStyle(
        'Label', parent=styles['Normal'], fontSize=7.5, fontName='Helvetica-Bold',
        textColor=SUBTLE, leading=10,
    )
    value_style = ParagraphStyle(
        'Value', parent=styles['Normal'], fontSize=10.5, fontName='Helvetica-Bold',
        textColor=INK, leading=13,
    )
    value_light_style = ParagraphStyle(
        'ValueLight', parent=styles['Normal'], fontSize=9, fontName='Helvetica',
        textColor=INK, leading=12,
    )
    profile_name_style = ParagraphStyle(
        'ProfileName', parent=styles['Normal'], fontSize=14, fontName='Helvetica-Bold',
        textColor=INK, leading=17,
    )
    profile_meta_style = ParagraphStyle(
        'ProfileMeta', parent=styles['Normal'], fontSize=9.5, fontName='Helvetica',
        textColor=SUBTLE, leading=13,
    )
    status_ok_style = ParagraphStyle(
        'StatusOk', parent=styles['Normal'], fontSize=8, fontName='Helvetica-Bold',
        textColor=SUCCESS, leading=10, alignment=1,
    )
    status_pending_style = ParagraphStyle(
        'StatusPending', parent=styles['Normal'], fontSize=8, fontName='Helvetica-Bold',
        textColor=PENDING, leading=10, alignment=1,
    )
    image_caption_style = ParagraphStyle(
        'ImageCaption', parent=styles['Normal'], fontSize=7.5, fontName='Helvetica-Bold',
        textColor=SUBTLE, leading=10, alignment=1,
    )
    page_kicker_style = ParagraphStyle(
        'PageKicker', parent=styles['Normal'], fontSize=8, fontName='Helvetica-Bold',
        textColor=ACCENT, leading=10,
    )
    empty_style = ParagraphStyle(
        'Empty', parent=styles['Normal'], fontSize=9, fontName='Helvetica-Oblique',
        textColor=FAINT, leading=12,
    )

    # ---------- Reusable builders ----------
    def divider(color=BORDER, thickness=1):
        return HRFlowable(width="100%", thickness=thickness, color=color, spaceBefore=6, spaceAfter=6)

    def page_header(kicker, title, subtitle=None):
        elements = [Paragraph(kicker.upper(), page_kicker_style), Spacer(1, 1)]
        elements.append(Paragraph(title, doc_title_style))
        if subtitle:
            elements.append(Spacer(1, 1))
            elements.append(Paragraph(subtitle, doc_subtitle_style))
        elements.append(divider(ACCENT_SOFT, 1))
        return elements

    def status_pill(is_received: bool):
        text = "✓ Received" if is_received else "○ Pending"
        style = status_ok_style if is_received else status_pending_style
        bg = SUCCESS_SOFT if is_received else colors.HexColor('#FFFBEB')
        t = Table([[Paragraph(text, style)]], colWidths=[0.95 * inch])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), bg),
            ('BOX', (0, 0), (-1, -1), 0.5, BORDER),
            ('TOPPADDING', (0, 0), (-1, -1), 3),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ]))
        return t

    def checklist_row(index, label, is_received):
        row = Table(
            [[
                Paragraph(f"{index}", ParagraphStyle('idx', parent=label_style, textColor=FAINT, fontSize=8)),
                Paragraph(label, value_light_style),
                status_pill(is_received),
            ]],
            colWidths=[0.28 * inch, 3.3 * inch, 1.05 * inch],
        )
        row.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('ALIGN', (2, 0), (2, 0), 'RIGHT'),
            ('LINEBELOW', (0, 0), (-1, -1), 0.5, BORDER),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ('LEFTPADDING', (0, 0), (-1, -1), 2),
            ('RIGHTPADDING', (0, 0), (-1, -1), 2),
        ]))
        return row

    def card_wrap(inner_flowables, pad=10, bg=CARD_BG, border=BORDER):
        """Wrap a list of flowables in a soft card (single-cell table)."""
        t = Table([[inner_flowables]], colWidths=[7.0 * inch])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), bg),
            ('BOX', (0, 0), (-1, -1), 0.75, border),
            ('LEFTPADDING', (0, 0), (-1, -1), pad),
            ('RIGHTPADDING', (0, 0), (-1, -1), pad),
            ('TOPPADDING', (0, 0), (-1, -1), pad),
            ('BOTTOMPADDING', (0, 0), (-1, -1), pad),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ]))
        return t

    def scaled_image(path, max_w, max_h):
        """Return an RLImage scaled to fit within max_w x max_h, preserving aspect ratio."""
        try:
            with PIL.Image.open(str(path)) as im:
                iw, ih = im.size
            ratio = min(max_w / iw, max_h / ih)
            w, h = iw * ratio, ih * ratio
            img = RLImage(str(path))
            img.drawWidth = w
            img.drawHeight = h
            return img
        except Exception:
            try:
                img = RLImage(str(path))
                img.drawWidth = max_w
                img.drawHeight = max_h
                return img
            except Exception:
                return None

    def photo_frame(path, w, h):
        """A photo inside a light bordered frame, or a placeholder if missing."""
        if path and path.exists():
            img = scaled_image(path, w - 8, h - 8)
            if img is not None:
                cell = img
            else:
                cell = Paragraph("Image unavailable", empty_style)
        else:
            cell = Paragraph("No photo", empty_style)
        frame = Table([[cell]], colWidths=[w], rowHeights=[h])
        frame.setStyle(TableStyle([
            ('BOX', (0, 0), (-1, -1), 1, BORDER),
            ('BACKGROUND', (0, 0), (-1, -1), WHITE),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ]))
        return frame

    def document_pair_card(front_path, back_path, max_w=2.3 * inch, max_h=2.4 * inch):
        """Front/Back document images shown side-by-side inside a soft card."""
        front_frame = photo_frame(front_path, max_w, max_h)
        back_frame = photo_frame(back_path, max_w, max_h)
        inner = Table(
            [
                [Paragraph("FRONT", image_caption_style), Paragraph("BACK", image_caption_style)],
                [front_frame, back_frame],
            ],
            colWidths=[max_w + 0.1 * inch, max_w + 0.1 * inch],
        )
        inner.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 3),
            ('TOPPADDING', (0, 0), (-1, -1), 2),
        ]))
        return card_wrap(inner, pad=8)

    def document_single_card(path, max_w=5.4 * inch, max_h=3.0 * inch):
        if path and path.exists():
            img = scaled_image(path, max_w, max_h)
            content = img if img is not None else Paragraph("Image unavailable", empty_style)
        else:
            content = Paragraph("Not uploaded", empty_style)
        wrapper = Table([[content]], colWidths=[max_w])
        wrapper.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ]))
        return card_wrap(wrapper, pad=10)

    def profile_card(name, mobile_label, mobile_value, photo_path, extra_rows=None):
        """Facebook/LinkedIn-style profile header: photo left, details right."""
        photo = photo_frame(photo_path, 1.0 * inch, 1.15 * inch)
        detail_flow = [
            Paragraph(name or "N/A", profile_name_style),
            Spacer(1, 2),
            Paragraph(f"{mobile_label}:  {mobile_value or 'N/A'}", profile_meta_style),
        ]
        if extra_rows:
            for r in extra_rows:
                detail_flow.append(Spacer(1, 2))
                detail_flow.append(Paragraph(r, profile_meta_style))
        inner = Table(
            [[photo, detail_flow]],
            colWidths=[1.25 * inch, 5.2 * inch],
        )
        inner.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('LEFTPADDING', (1, 0), (1, 0), 12),
        ]))
        return card_wrap(inner, pad=8, bg=WHITE, border=BORDER)

    def doc_section_title(text, valid_upto=None):
        elements = [Paragraph(text.upper(), section_header_style)]
        if valid_upto:
            elements.append(Paragraph(f"Valid upto: {valid_upto}", section_sub_style))
        elements.append(Spacer(1, 4))
        return elements

# ==================== PAGE 1 — SUMMARY / CHECKLIST ===================
    story += page_header(
        "Documents Checklist",
        truck.get('vehicle_number', 'N/A'),
        "Generated document pack — verify all items before dispatch."
    )
    story.append(Spacer(1, 2))
    meta_row = Table(
        [[
            Paragraph("DATE", label_style),
            Paragraph("______ / ______ / ______", value_light_style),
            Paragraph("TRUCK NUMBER", label_style),
            Paragraph(truck.get('vehicle_number', 'N/A'), value_style),
        ]],
        colWidths=[0.6 * inch, 2.2 * inch, 1.1 * inch, 2.5 * inch],
    )
    meta_row.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BACKGROUND', (0, 0), (-1, -1), CARD_BG),
        ('BOX', (0, 0), (-1, -1), 0.75, BORDER),
        ('LEFTPADDING', (0, 0), (-1, -1), 5),
        ('RIGHTPADDING', (0, 0), (-1, -1), 5),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    story.append(meta_row)
    story.append(Spacer(1, 4))

    # Driver detail card
    driver_checklist = [
        Paragraph("DRIVER DETAILS", section_header_style),
        Spacer(1, 2),
        checklist_row(1, "Driver License", bool(get_file_ids(truck.get("driver_license")))),
        checklist_row(2, "Driver Aadhaar", bool(get_file_ids(truck.get("driver_aadhaar")))),
        checklist_row(3, "Driver Photo", bool(get_file_ids(truck.get("driver_photo")))),
        checklist_row(4, "Driver Mobile No.", bool(truck.get("driver_mobile"))),
    ]
    story.append(card_wrap(driver_checklist, pad=5, bg=WHITE))
    story.append(Spacer(1, 2))

    story.append(profile_card(
        truck.get('driver_name', 'N/A'),
        "Mobile",
        truck.get('driver_mobile', 'N/A'),
        get_file_path(truck.get("driver_photo")) if truck.get("driver_photo") else None,
    ))
    story.append(Spacer(1, 4))

    # Helper detail card (optional)
    if truck.get("helper1_aadhaar") or truck.get("helper1_name"):
        helper_checklist = [
            Paragraph("HELPER (खलासी) DETAILS", section_header_style),
            Paragraph("Optional", section_sub_style),
            Spacer(1, 1),
            checklist_row(5, "Helper Aadhaar", bool(get_file_ids(truck.get("helper1_aadhaar")))),
            checklist_row(6, "Helper Photo", bool(get_file_ids(truck.get("helper1_photo")))),
        ]
        story.append(card_wrap(helper_checklist, pad=5, bg=WHITE))
        story.append(Spacer(1, 2))

        story.append(profile_card(
            truck.get('helper1_name', 'N/A'),
            "Mobile",
            truck.get('helper1_mobile', 'N/A'),
            get_file_path(truck.get("helper1_photo")) if truck.get("helper1_photo") else None,
        ))
        story.append(Spacer(1, 2))
    
    # Document validity card
    validity_pairs = [
        ("Registration Date", truck.get('registration_date', '____'), None),
        ("Fitness Valid Upto", truck.get('fitness_valid_upto', '____'), "fitness_certificate"),
        ("Tax Valid Upto", truck.get('tax_valid_upto', '____'), "tax"),
        ("Insurance Valid Upto", truck.get('insurance_valid_upto', '____'), "insurance"),
        ("Pollution (PUCC) Valid Upto", truck.get('pollution_valid_upto', '____'), "pollution"),
        ("Permit Valid Upto", truck.get('permit_valid_upto', '____'), "rc"),
        ("m-Parivaahan Doc", None, "m_parivaahan"),
    ]
    validity_flow = [Paragraph("DOCUMENT VALIDITY", section_header_style), Spacer(1, 2)]
    validity_rows = []
    for label, val, field_key in validity_pairs:
        value_text = str(val) if val else "____"
        file_ids = get_file_ids(truck.get(field_key)) if field_key else []
        is_uploaded = bool(file_ids)
        status_cell = status_pill(is_uploaded) if field_key else ""
        validity_rows.append([
            Paragraph(label, label_style),
            Paragraph(value_text, value_light_style),
            status_cell
        ])
    validity_table = Table(validity_rows, colWidths=[2.3 * inch, 2.3 * inch, 1.4 * inch])
    validity_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LINEBELOW', (0, 0), (-1, -2), 0.5, BORDER),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('LEFTPADDING', (0, 0), (-1, -1), 2),
        ('ALIGN', (2, 0), (2, -1), 'CENTER'),
    ]))
    validity_flow.append(validity_table)
    story.append(card_wrap(validity_flow, pad=4, bg=WHITE))
    story.append(Spacer(1, 6))

# ==================== PAGE 2: DRIVER DOCUMENTS ====================
    story.append(PageBreak())
    story += page_header("Section 02", "Driver Documents")
    story.append(Spacer(1, 4))

    story.append(profile_card(
        truck.get('driver_name', 'N/A'),
        "Mobile",
        truck.get('driver_mobile', 'N/A'),
        get_file_path(truck.get("driver_photo")) if truck.get("driver_photo") else None,
    ))
    story.append(Spacer(1, 8))

    story += doc_section_title("Driver License")
    driver_license = truck.get("driver_license")
    file_ids = get_file_ids(driver_license) if driver_license else []
    if len(file_ids) == 2:
        story.append(document_pair_card(get_file_path(file_ids[0]), get_file_path(file_ids[1])))
    elif len(file_ids) == 1:
        story.append(document_single_card(get_file_path(file_ids[0])))
    else:
        story.append(card_wrap(Paragraph("Not uploaded", empty_style), pad=10))
    story.append(Spacer(1, 8))

    story += doc_section_title("Driver Aadhaar")
    driver_aadhaar = truck.get("driver_aadhaar")
    file_ids = get_file_ids(driver_aadhaar) if driver_aadhaar else []
    if len(file_ids) == 2:
        story.append(document_pair_card(get_file_path(file_ids[0]), get_file_path(file_ids[1])))
    elif len(file_ids) == 1:
        story.append(document_single_card(get_file_path(file_ids[0])))
    else:
        story.append(card_wrap(Paragraph("Not uploaded", empty_style), pad=10))

    # ==================== PAGE 3: HELPER DOCUMENTS ====================
    story.append(PageBreak())
    story += page_header("Section 03", "Helper Documents")
    story.append(Spacer(1, 4))

    story.append(profile_card(
        truck.get('helper1_name', 'N/A'),
        "Mobile",
        truck.get('helper1_mobile', 'N/A'),
        get_file_path(truck.get("helper1_photo")) if truck.get("helper1_photo") else None,
    ))
    story.append(Spacer(1, 8))

    story += doc_section_title("Helper Aadhaar")
    helper_aadhaar = truck.get("helper1_aadhaar")
    file_ids = get_file_ids(helper_aadhaar) if helper_aadhaar else []
    if len(file_ids) == 2:
        story.append(document_pair_card(get_file_path(file_ids[0]), get_file_path(file_ids[1])))
    elif len(file_ids) == 1:
        story.append(document_single_card(get_file_path(file_ids[0])))
    else:
        story.append(card_wrap(Paragraph("Not uploaded", empty_style), pad=10))

    # ==================== PAGE 4: m-Parivaahan ====================
    story.append(PageBreak())
    story += page_header("Section 04", "m-Parivaahan Document")
    story.append(Spacer(1, 6))

    m_parivaahan = truck.get("m_parivaahan")
    m_path = get_file_path(m_parivaahan) if isinstance(m_parivaahan, str) and m_parivaahan else None
    story.append(document_single_card(m_path, max_w=5.6 * inch, max_h=8.2 * inch))

    # ==================== PAGES 5+: INDIVIDUAL DOCUMENTS ====================
    document_fields = [
        ("fitness_certificate", "Fitness Certificate", truck.get('fitness_valid_upto', '____')),
        ("pollution", "Pollution (PUCC)", truck.get('pollution_valid_upto', '____')),
        ("insurance", "Insurance", truck.get('insurance_valid_upto', '____')),
        ("tax", "Tax", truck.get('tax_valid_upto', '____')),
        ("rc", "RC", truck.get('permit_valid_upto', '____')),
    ]

    section_no = 5
    for field_key, field_label, validity_date in document_fields:
        value = truck.get(field_key)
        if not value:
            continue

        file_ids = get_file_ids(value)
        if not file_ids:
            continue

        story.append(PageBreak())
        story += page_header(f"Section 0{section_no}", field_label, f"Valid upto: {validity_date}")
        story.append(Spacer(1, 6))

        for file_id in file_ids:
            story.append(document_single_card(get_file_path(file_id), max_w=5.6 * inch, max_h=8.2 * inch))
            story.append(Spacer(1, 6))

        section_no += 1

    doc.build(story)
    output.seek(0)

    filename = f"truck_{truck.get('vehicle_number', truck_id)}_documents.pdf"
    return StreamingResponse(
        output,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/trucks/{truck_id}/download-documents-checklist")
async def download_truck_documents_checklist(truck_id: str, current_user: dict = Depends(get_download_user)):
    """Download truck documents checklist as PDF (first page only)"""
    truck = await db.trucks.find_one({"id": truck_id}, {"_id": 0})
    if not truck:
        raise HTTPException(status_code=404, detail="Truck not found")

    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.lib import colors
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.units import inch
        from reportlab.platypus import (
            SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer,
            HRFlowable, Image as RLImage
        )
        import PIL.Image
    except ImportError:
        raise HTTPException(status_code=500, detail="PDF export requires reportlab library")

    # ==================== DESIGN SYSTEM ====================
    INK = colors.HexColor('#111827')
    SUBTLE = colors.HexColor('#6B7280')
    FAINT = colors.HexColor('#9CA3AF')
    BORDER = colors.HexColor('#E5E7EB')
    CARD_BG = colors.HexColor('#F9FAFB')
    ACCENT = colors.HexColor('#4F46E5')
    ACCENT_SOFT = colors.HexColor('#EEF2FF')
    SUCCESS = colors.HexColor('#059669')
    SUCCESS_SOFT = colors.HexColor('#ECFDF5')
    PENDING = colors.HexColor('#D97706')
    WHITE = colors.white

    from pathlib import Path
    UPLOAD_DIR = Path(__file__).parent.parent / "uploads"

    output = io.BytesIO()
    doc = SimpleDocTemplate(
        output,
        pagesize=A4,
        leftMargin=0.35 * inch,
        rightMargin=0.35 * inch,
        topMargin=0.35 * inch,
        bottomMargin=0.35 * inch,
    )
    story = []
    styles = getSampleStyleSheet()

    page_kicker_style = ParagraphStyle(
        'PageKicker', parent=styles['Normal'], fontSize=8, fontName='Helvetica-Bold',
        textColor=ACCENT, leading=10,
    )
    section_sub_style = ParagraphStyle(
        'SectionSub', parent=styles['Normal'], fontSize=8, fontName='Helvetica',
        textColor=SUBTLE, leading=11,
    )
    doc_title_style = ParagraphStyle(
        'DocTitle', parent=styles['Normal'], fontSize=20, fontName='Helvetica-Bold',
        textColor=INK, leading=24,
    )
    doc_subtitle_style = ParagraphStyle(
        'DocSubtitle', parent=styles['Normal'], fontSize=9.5, fontName='Helvetica',
        textColor=SUBTLE, leading=13,
    )
    section_header_style = ParagraphStyle(
        'SectionHeader', parent=styles['Normal'], fontSize=10.5, fontName='Helvetica-Bold',
        textColor=INK, leading=14,
    )
    label_style = ParagraphStyle(
        'Label', parent=styles['Normal'], fontSize=7.5, fontName='Helvetica-Bold',
        textColor=SUBTLE, leading=10,
    )
    value_light_style = ParagraphStyle(
        'ValueLight', parent=styles['Normal'], fontSize=9, fontName='Helvetica',
        textColor=INK, leading=12,
    )
    value_style = ParagraphStyle(
        'Value', parent=styles['Normal'], fontSize=10.5, fontName='Helvetica-Bold',
        textColor=INK, leading=13,
    )
    status_ok_style = ParagraphStyle(
        'StatusOk', parent=styles['Normal'], fontSize=8, fontName='Helvetica-Bold',
        textColor=SUCCESS, leading=10, alignment=1,
    )
    status_pending_style = ParagraphStyle(
        'StatusPending', parent=styles['Normal'], fontSize=8, fontName='Helvetica-Bold',
        textColor=PENDING, leading=10, alignment=1,
    )
    empty_style = ParagraphStyle(
        'Empty', parent=styles['Normal'], fontSize=9, fontName='Helvetica-Oblique',
        textColor=FAINT, leading=12,
    )
    profile_name_style = ParagraphStyle(
        'ProfileName', parent=styles['Normal'], fontSize=14, fontName='Helvetica-Bold',
        textColor=INK, leading=17,
    )
    profile_meta_style = ParagraphStyle(
        'ProfileMeta', parent=styles['Normal'], fontSize=9.5, fontName='Helvetica',
        textColor=SUBTLE, leading=13,
    )
    profile_sub_style = ParagraphStyle(
        'ProfileSub', parent=styles['Normal'], fontSize=8, fontName='Helvetica',
        textColor=SUBTLE, leading=11,
    )

    def divider(color=BORDER, thickness=1):
        return HRFlowable(width="100%", thickness=thickness, color=color, spaceBefore=3, spaceAfter=3)

    def page_header(kicker, title, subtitle=None):
        elements = [Paragraph(kicker.upper(), page_kicker_style), Spacer(1, 1)]
        elements.append(Paragraph(title, doc_title_style))
        if subtitle:
            elements.append(Spacer(1, 1))
            elements.append(Paragraph(subtitle, doc_subtitle_style))
        elements.append(divider(ACCENT_SOFT, 1))
        return elements

    def status_pill(is_received: bool):
        text = "✓ Received" if is_received else "○ Pending"
        style = status_ok_style if is_received else status_pending_style
        bg = SUCCESS_SOFT if is_received else colors.HexColor('#FFFBEB')
        t = Table([[Paragraph(text, style)]], colWidths=[0.95 * inch])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), bg),
            ('BOX', (0, 0), (-1, -1), 0.5, BORDER),
            ('TOPPADDING', (0, 0), (-1, -1), 3),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ]))
        return t

    def checklist_row(index, label, is_received):
        row = Table(
            [[
                Paragraph(f"{index}", ParagraphStyle('idx', parent=label_style, textColor=FAINT, fontSize=8)),
                Paragraph(label, value_light_style),
                status_pill(is_received),
            ]],
            colWidths=[0.28 * inch, 3.3 * inch, 1.05 * inch],
        )
        row.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('ALIGN', (2, 0), (2, 0), 'RIGHT'),
            ('LINEBELOW', (0, 0), (-1, -1), 0.5, BORDER),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ('LEFTPADDING', (0, 0), (-1, -1), 2),
            ('RIGHTPADDING', (0, 0), (-1, -1), 2),
        ]))
        return row

    def card_wrap(inner_flowables, pad=10, bg=CARD_BG, border=BORDER):
        t = Table([[inner_flowables]], colWidths=[7.0 * inch])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), bg),
            ('BOX', (0, 0), (-1, -1), 0.75, border),
            ('LEFTPADDING', (0, 0), (-1, -1), pad),
            ('RIGHTPADDING', (0, 0), (-1, -1), pad),
            ('TOPPADDING', (0, 0), (-1, -1), pad),
            ('BOTTOMPADDING', (0, 0), (-1, -1), pad),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ]))
        return t

    def profile_card(name, mobile_label, mobile_value, photo_path):
        def scaled_image(path, max_w, max_h):
            try:
                with PIL.Image.open(str(path)) as im:
                    iw, ih = im.size
                    ratio = min(max_w / iw, max_h / ih)
                    w, h = iw * ratio, ih * ratio
                    img = RLImage(str(path))
                    img.drawWidth = w
                    img.drawHeight = h
                    return img
            except Exception:
                return None

        photo_w, photo_h = 1.0 * inch, 1.15 * inch
        if photo_path and photo_path.exists():
            img = scaled_image(photo_path, photo_w - 8, photo_h - 8)
            if img:
                photo_cell = img
            else:
                photo_cell = Paragraph("Image unavailable", empty_style)
        else:
            photo_cell = Paragraph("No photo", empty_style)

        detail_flow = [
            Paragraph(name or "N/A", profile_name_style),
            Spacer(1, 2),
            Paragraph(f"{mobile_label}:  {mobile_value or 'N/A'}", profile_meta_style),
        ]
        inner = Table(
            [[photo_cell, detail_flow]],
            colWidths=[1.25 * inch, 5.2 * inch],
        )
        inner.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('LEFTPADDING', (1, 0), (1, 0), 12),
        ]))
        return card_wrap(inner, pad=8, bg=WHITE, border=BORDER)

    def get_file_ids(value) -> list:
        if isinstance(value, dict):
            return [v for v in [value.get("front"), value.get("back")] if v]
        elif isinstance(value, str) and value.strip():
            return [value]
        return []

    def get_file_path(file_id: str) -> Path:
        return UPLOAD_DIR / file_id

    # ==================== PAGE 1 — CHECKLIST ONLY ===================
    story += page_header(
        "Documents Checklist",
        truck.get('vehicle_number', 'N/A'),
        "Generated document pack — verify all items before dispatch."
    )
    story.append(Spacer(1, 4))

    meta_row = Table(
        [[
            Paragraph("DATE", label_style),
            Paragraph("______ / ______ / ______", value_light_style),
            Paragraph("TRUCK NUMBER", label_style),
            Paragraph(truck.get('vehicle_number', 'N/A'), value_style),
        ]],
        colWidths=[0.6 * inch, 2.2 * inch, 1.1 * inch, 2.5 * inch],
    )
    meta_row.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BACKGROUND', (0, 0), (-1, -1), CARD_BG),
        ('BOX', (0, 0), (-1, -1), 0.75, BORDER),
        ('LEFTPADDING', (0, 0), (-1, -1), 5),
        ('RIGHTPADDING', (0, 0), (-1, -1), 5),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    story.append(meta_row)
    story.append(Spacer(1, 6))

    driver_checklist = [
        Paragraph("DRIVER DETAILS", section_header_style),
        Spacer(1, 2),
        checklist_row(1, "Driver License", bool(get_file_ids(truck.get("driver_license")))),
        checklist_row(2, "Driver Aadhaar", bool(get_file_ids(truck.get("driver_aadhaar")))),
        checklist_row(3, "Driver Photo", bool(get_file_ids(truck.get("driver_photo")))),
        checklist_row(4, "Driver Mobile No.", bool(truck.get("driver_mobile"))),
    ]
    story.append(card_wrap(driver_checklist, pad=5, bg=WHITE))
    story.append(Spacer(1, 4))

    story.append(profile_card(
        truck.get('driver_name', 'N/A'),
        "Mobile",
        truck.get('driver_mobile', 'N/A'),
        get_file_path(truck.get("driver_photo")) if truck.get("driver_photo") else None,
    ))
    story.append(Spacer(1, 6))

    if truck.get("helper1_aadhaar") or truck.get("helper1_name"):
        helper_checklist = [
            Paragraph("HELPER (खलासी) DETAILS", section_header_style),
            Paragraph("Optional", profile_sub_style),
            Spacer(1, 1),
            checklist_row(5, "Helper Aadhaar", bool(get_file_ids(truck.get("helper1_aadhaar")))),
            checklist_row(6, "Helper Photo", bool(get_file_ids(truck.get("helper1_photo")))),
        ]
        story.append(card_wrap(helper_checklist, pad=5, bg=WHITE))
        story.append(Spacer(1, 4))

        story.append(profile_card(
            truck.get('helper1_name', 'N/A'),
            "Mobile",
            truck.get('helper1_mobile', 'N/A'),
            get_file_path(truck.get("helper1_photo")) if truck.get("helper1_photo") else None,
        ))
        story.append(Spacer(1, 4))

    validity_pairs = [
        ("Registration Date", truck.get('registration_date', '____'), None),
        ("Fitness Valid Upto", truck.get('fitness_valid_upto', '____'), "fitness_certificate"),
        ("Tax Valid Upto", truck.get('tax_valid_upto', '____'), "tax"),
        ("Insurance Valid Upto", truck.get('insurance_valid_upto', '____'), "insurance"),
        ("Pollution (PUCC) Valid Upto", truck.get('pollution_valid_upto', '____'), "pollution"),
        ("Permit Valid Upto", truck.get('permit_valid_upto', '____'), "rc"),
        ("m-Parivaahan Doc", None, "m_parivaahan"),
    ]
    validity_flow = [Paragraph("DOCUMENT VALIDITY", section_header_style), Spacer(1, 2)]
    validity_rows = []
    for label, val, field_key in validity_pairs:
        value_text = str(val) if val else "____"
        file_ids = get_file_ids(truck.get(field_key)) if field_key else []
        is_uploaded = bool(file_ids)
        status_cell = status_pill(is_uploaded) if field_key else ""
        validity_rows.append([
            Paragraph(label, label_style),
            Paragraph(value_text, value_light_style),
            status_cell
        ])
    validity_table = Table(validity_rows, colWidths=[2.3 * inch, 2.3 * inch, 1.4 * inch])
    validity_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LINEBELOW', (0, 0), (-1, -2), 0.5, BORDER),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('LEFTPADDING', (0, 0), (-1, -1), 2),
        ('ALIGN', (2, 0), (2, -1), 'CENTER'),
    ]))
    validity_flow.append(validity_table)
    story.append(card_wrap(validity_flow, pad=4, bg=WHITE))

    doc.build(story)
    output.seek(0)

    filename = f"truck_{truck.get('vehicle_number', truck_id)}_checklist.pdf"
    return StreamingResponse(
        output,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
