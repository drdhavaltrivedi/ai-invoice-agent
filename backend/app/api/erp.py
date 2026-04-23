from fastapi import APIRouter, HTTPException
from app.core.supabase import get_supabase
from app.models.schemas import VendorCreate, VendorUpdate, PurchaseOrderCreate, GRNCreate
from app.services.embeddings import generate_embedding, generate_po_search_string

router = APIRouter(prefix="/api/erp", tags=["erp"])


# --- Vendors ---

@router.get("/vendors")
async def list_vendors():
    db = get_supabase()
    return db.table("vendors").select("*").order("name").execute().data


@router.post("/vendors")
async def create_vendor(body: VendorCreate):
    db = get_supabase()
    result = db.table("vendors").insert(body.model_dump()).execute()
    return result.data[0]


@router.patch("/vendors/{vendor_id}")
async def update_vendor(vendor_id: str, body: VendorUpdate):
    db = get_supabase()
    result = db.table("vendors").update(body.model_dump(exclude_none=True)).eq("id", vendor_id).execute()
    if not result.data:
        raise HTTPException(404, "Vendor not found")
    return result.data[0]


# --- Purchase Orders ---

@router.get("/purchase-orders")
async def list_purchase_orders(status: str = None):
    db = get_supabase()
    query = db.table("purchase_orders").select("*, vendors(name)")
    if status:
        query = query.eq("status", status)
    return query.order("created_at", desc=True).execute().data


@router.post("/purchase-orders")
async def create_purchase_order(body: PurchaseOrderCreate):
    db = get_supabase()
    existing = db.table("purchase_orders").select("id").eq("po_number", body.po_number).execute()
    if existing.data:
        raise HTTPException(400, f"PO number {body.po_number} already exists")
    data = body.model_dump()
    data["status"] = "open"
    
    # Generate embedding for semantic matching
    try:
        search_str = generate_po_search_string(data)
        data["embedding"] = generate_embedding(search_str)
    except Exception as e:
        print(f"Warning: Could not generate PO embedding: {e}")
        
    result = db.table("purchase_orders").insert(data).execute()
    return result.data[0]


@router.patch("/purchase-orders/{po_id}")
async def update_purchase_order(po_id: str, body: dict):
    db = get_supabase()
    result = db.table("purchase_orders").update(body).eq("id", po_id).execute()
    if not result.data:
        raise HTTPException(404, "PO not found")
    return result.data[0]


@router.get("/purchase-orders/{po_id}")
async def get_purchase_order(po_id: str):
    db = get_supabase()
    result = db.table("purchase_orders").select("*, vendors(*), grns(*)").eq("id", po_id).single().execute()
    if not result.data:
        raise HTTPException(404, "PO not found")
    return result.data


# --- GRNs ---

@router.get("/grns")
async def list_grns():
    db = get_supabase()
    return db.table("grns").select("*, purchase_orders(po_number, vendors(name))").order("created_at", desc=True).execute().data


@router.post("/grns")
async def create_grn(body: GRNCreate):
    db = get_supabase()
    po_res = db.table("purchase_orders").select("*").eq("id", body.po_id).single().execute()
    if not po_res.data:
        raise HTTPException(404, "Purchase order not found")
    existing = db.table("grns").select("id").eq("grn_number", body.grn_number).execute()
    if existing.data:
        raise HTTPException(400, f"GRN number {body.grn_number} already exists")
    data = body.model_dump()
    data["status"] = "received"
    result = db.table("grns").insert(data).execute()
    db.table("purchase_orders").update({"status": "received"}).eq("id", body.po_id).execute()
    return result.data[0]


# --- ERP Ledger ---

@router.get("/ledger")
async def get_ap_ledger(page: int = 1, limit: int = 50):
    db = get_supabase()
    offset = (page - 1) * limit
    result = (
        db.table("erp_entries")
        .select("*, invoices(invoice_number, total, vendors(name))")
        .order("created_at", desc=True)
        .range(offset, offset + limit - 1)
        .execute()
    )
    return result.data
