from fastapi import APIRouter, UploadFile, File, HTTPException, BackgroundTasks
from app.core.supabase import get_supabase
from app.services.gemini import extract_invoice_data
from app.services.matcher import run_matching
import uuid

router = APIRouter(prefix="/api/invoices", tags=["invoices"])


@router.post("/upload")
async def upload_invoice(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    allowed = ["application/pdf", "image/jpeg", "image/png", "image/jpg"]
    if file.content_type not in allowed:
        raise HTTPException(400, "Only PDF, JPG, PNG files are accepted")

    file_bytes = await file.read()
    if len(file_bytes) > 10 * 1024 * 1024:
        raise HTTPException(400, "File size must be under 10MB")

    db = get_supabase()
    storage_path = f"invoices/upload_{uuid.uuid4()}_{file.filename}"
    db.storage.from_("invoices").upload(storage_path, file_bytes, {"content-type": file.content_type})
    file_url = db.storage.from_("invoices").get_public_url(storage_path)

    invoice_res = db.table("invoices").insert({
        "source": "upload",
        "raw_file_url": file_url,
        "status": "processing",
        "original_filename": file.filename,
    }).execute()

    invoice = invoice_res.data[0]
    invoice_id = invoice["id"]

    background_tasks.add_task(_process_invoice, invoice_id, file_bytes, file.filename)

    return {"invoice_id": invoice_id, "status": "processing", "message": "Invoice uploaded and queued for extraction"}


async def _process_invoice(invoice_id: str, file_bytes: bytes, filename: str):
    db = get_supabase()
    try:
        extracted = await extract_invoice_data(file_bytes, filename)
        db.table("invoices").update({
            "extracted_data": extracted.model_dump(),
            "invoice_number": extracted.invoice_number,
            "po_number": extracted.po_number,
            "total": extracted.total,
            "status": "extracted",
        }).eq("id", invoice_id).execute()

        await run_matching(invoice_id)
    except Exception as e:
        db.table("invoices").update({"status": "exception"}).eq("id", invoice_id).execute()
        db.table("exceptions").insert({
            "invoice_id": invoice_id,
            "reason": f"Processing failed: {str(e)}",
            "status": "open",
        }).execute()


@router.get("")
async def list_invoices(status: str = None, page: int = 1, limit: int = 20):
    db = get_supabase()
    offset = (page - 1) * limit
    query = db.table("invoices").select("*, vendors(name), invoice_matches(match_status, po_id)")
    if status:
        query = query.eq("status", status)
    result = query.order("created_at", desc=True).range(offset, offset + limit - 1).execute()
    count_q = db.table("invoices").select("id", count="exact")
    if status:
        count_q = count_q.eq("status", status)
    count_res = count_q.execute()
    return {"data": result.data, "total": count_res.count, "page": page, "limit": limit}


@router.get("/stats/summary")
async def get_stats():
    db = get_supabase()
    total = db.table("invoices").select("id", count="exact").execute().count
    by_status = {}
    for status in ["received", "processing", "extracted", "matched", "exception", "posted", "rejected"]:
        count = db.table("invoices").select("id", count="exact").eq("status", status).execute().count
        by_status[status] = count
    exceptions_open = db.table("exceptions").select("id", count="exact").eq("status", "open").execute().count
    return {"total": total, "by_status": by_status, "open_exceptions": exceptions_open}


@router.get("/{invoice_id}")
async def get_invoice(invoice_id: str):
    db = get_supabase()
    result = db.table("invoices").select(
        "*, vendors(name, email, gstin), invoice_matches(*, purchase_orders(po_number), grns(grn_number)), exceptions(*)"
    ).eq("id", invoice_id).single().execute()
    if not result.data:
        raise HTTPException(404, "Invoice not found")
    return result.data


@router.delete("/{invoice_id}")
async def delete_invoice(invoice_id: str):
    db = get_supabase()
    result = db.table("invoices").delete().eq("id", invoice_id).execute()
    if not result.data:
        raise HTTPException(404, "Invoice not found")
    return {"status": "success", "message": "Invoice deleted"}
