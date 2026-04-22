import os
from dotenv import load_dotenv
load_dotenv("backend/.env")
from app.core.supabase import get_supabase

db = get_supabase()
def list_recursive(folder):
    items = db.storage.from_("invoices").list(folder)
    for item in items:
        path = f"{folder}/{item['name']}" if folder else item['name']
        if item['id'] is None: # It's a folder
            list_recursive(path)
        else:
            print(path)

list_recursive("")
