import os
from dotenv import load_dotenv
load_dotenv("backend/.env")
from app.core.supabase import get_supabase

db = get_supabase()
res = db.storage.list_buckets()
print(res)
