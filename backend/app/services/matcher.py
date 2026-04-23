from typing import Optional
from app.core.supabase import get_supabase
from app.models.schemas import MatchStatus
from app.services.matching import find_best_po_match

AMOUNT_TOLERANCE = 0.02  # 2% tolerance


async def run_matching(invoice_id: str) -> dict:
    db = get_supabase()

    invoice_res = db.table("invoices").select("*").eq("id", invoice_id).single().execute()
    invoice = invoice_res.data

    if not invoice:
        return {"status": "error", "message": "Invoice not found"}

    extracted = invoice.get("extracted_data", {})
    po_number = extracted.get("po_number") or invoice.get("po_number")
    invoice_total = extracted.get("total") or 0

    if not po_number:
        await _flag_exception(invoice_id, "No PO number found on invoice")
        return {"status": "exception", "reason": "no_po_number"}

    po_res = db.table("purchase_orders").select("*").eq("po_number", po_number).execute()
    
    # --- Self-Healing AI Loop ---
    if not po_res.data:
        from app.services.ai_learning import check_learnings, _categorize_reason
        # Try to find if this was auto-corrected before for this vendor
        learning = check_learnings(extracted.get("vendor_name"), po_number, "po_not_found")
        if learning and learning.get("corrected_po_number"):
            new_po = learning["corrected_po_number"]
            print(f"[Matcher] Applying AI Learning: Correcting PO {po_number} -> {new_po}")
            po_res = db.table("purchase_orders").select("*").eq("po_number", new_po).execute()
            if po_res.data:
                po_number = new_po
                # Update invoice with the auto-corrected PO
                db.table("invoices").update({"po_number": po_number}).eq("id", invoice_id).execute()

    if not po_res.data:
        # --- NEW: Semantic Similarity Fallback ---
        print(f"[Matcher] PO {po_number} not found. Trying semantic similarity search...")
        semantic_match = await find_best_po_match(extracted if extracted else invoice)
        
        if semantic_match:
            print(f"[Matcher] ✓ Found semantic match with PO {semantic_match['po_number']}")
            po_res = db.table("purchase_orders").select("*").eq("id", semantic_match["id"]).execute()
            if po_res.data:
                po_number = po_res.data[0]["po_number"]
                # Update invoice with the semantically matched PO
                db.table("invoices").update({"po_number": po_number}).eq("id", invoice_id).execute()

    if not po_res.data:
        await _flag_exception(invoice_id, f"PO number {po_number} not found in system (Exact & Semantic check failed)")
        return {"status": "exception", "reason": "po_not_found"}

    po = po_res.data[0]

    grn_res = db.table("grns").select("*").eq("po_id", po["id"]).execute()
    grns = grn_res.data or []

    if not grns:
        await _flag_exception(invoice_id, f"No GRN found for PO {po_number}")
        _update_invoice_status(invoice_id, "exception")
        return {"status": "exception", "reason": "no_grn"}

    po_amount = float(po.get("total_amount", 0))
    variance = abs(invoice_total - po_amount) / po_amount if po_amount > 0 else 1

    grn_id = grns[0]["id"]

    if variance > AMOUNT_TOLERANCE:
        # Check if we have a learning for this variance
        from app.services.ai_learning import check_learnings
        learning = check_learnings(extracted.get("vendor_name"), po_number, "amount_variance")
        if learning and learning.get("corrected_total") == invoice_total:
            print(f"[Matcher] Applying AI Learning: Auto-accepting amount variance for {extracted.get('vendor_name')}")
        else:
            reason = f"Amount variance {variance:.1%} exceeds {AMOUNT_TOLERANCE:.0%} tolerance. Invoice: {invoice_total}, PO: {po_amount}"
            await _flag_exception(invoice_id, reason)
            db.table("invoice_matches").insert({
                "invoice_id": invoice_id,
                "grn_id": grn_id,
                "po_id": po["id"],
                "match_score": round(1 - variance, 3),
                "match_status": MatchStatus.exception,
            }).execute()
            return {"status": "exception", "reason": "amount_variance", "variance": variance}

    dup_res = db.table("invoices").select("id").eq("invoice_number", invoice.get("invoice_number")).neq("id", invoice_id).execute()
    if dup_res.data:
        await _flag_exception(invoice_id, "Duplicate invoice number detected")
        return {"status": "exception", "reason": "duplicate_invoice"}

    db.table("invoice_matches").insert({
        "invoice_id": invoice_id,
        "grn_id": grn_id,
        "po_id": po["id"],
        "match_score": round(1 - variance, 3),
        "match_status": MatchStatus.auto_matched,
    }).execute()

    _update_invoice_status(invoice_id, "matched")
    await _post_to_erp(invoice_id, po, invoice, extracted)

    return {"status": "matched", "po_id": po["id"], "grn_id": grn_id}


async def _flag_exception(invoice_id: str, reason: str):
    db = get_supabase()
    db.table("exceptions").insert({
        "invoice_id": invoice_id,
        "reason": reason,
        "status": "open",
    }).execute()
    _update_invoice_status(invoice_id, "exception")
    await _notify_ap_team(invoice_id, reason)


def _update_invoice_status(invoice_id: str, status: str):
    db = get_supabase()
    db.table("invoices").update({"status": status}).eq("id", invoice_id).execute()


async def _notify_ap_team(invoice_id: str, reason: str):
    db = get_supabase()
    users_res = db.table("users").select("id").in_("role", ["admin", "manager", "ap_clerk"]).execute()
    users = users_res.data or []
    notifications = [
        {
            "user_id": u["id"],
            "message": f"Invoice exception: {reason}",
            "type": "exception",
            "invoice_id": invoice_id,
            "read": False,
        }
        for u in users
    ]
    if notifications:
        db.table("notifications").insert(notifications).execute()


async def _post_to_erp(invoice_id: str, po: dict, invoice: dict, extracted: dict):
    db = get_supabase()
    journal_entry = {
        "debit_account": "Expense/Asset",
        "credit_account": "Accounts Payable",
        "amount": extracted.get("total", 0),
        "description": f"Invoice {invoice.get('invoice_number')} from PO {po.get('po_number')}",
        "vendor_id": invoice.get("vendor_id"),
        "po_id": po.get("id"),
    }
    db.table("erp_entries").insert({
        "invoice_id": invoice_id,
        "journal_entry": journal_entry,
        "status": "posted",
    }).execute()
    _update_invoice_status(invoice_id, "posted")
