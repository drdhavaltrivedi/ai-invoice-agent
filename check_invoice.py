import os
from dotenv import load_dotenv
load_dotenv("backend/.env")
from app.core.supabase import get_supabase

db = get_supabase()
invoice_id = "141f98af-9bb6-476a-a86d-7dc7d44bbab1"
res = db.table("invoices").select("*").eq("id", invoice_id).execute()
print(res.data)
