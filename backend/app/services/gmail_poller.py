import base64
import os
import json
from googleapiclient.discovery import build
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from google_auth_oauthlib.flow import Flow
from app.core.config import settings
from app.core.supabase import get_supabase

SCOPES = ["https://www.googleapis.com/auth/gmail.readonly"]
TOKEN_FILE = "gmail_token.json"


import urllib.parse
import requests

def get_gmail_auth_url() -> str:
    params = {
        "client_id": settings.gmail_client_id,
        "redirect_uri": settings.gmail_redirect_uri,
        "response_type": "code",
        "scope": " ".join(SCOPES),
        "access_type": "offline",
        "prompt": "consent",
    }
    url = "https://accounts.google.com/o/oauth2/v2/auth?" + urllib.parse.urlencode(params)
    return url


def exchange_code_for_token(code: str) -> dict:
    data = {
        "client_id": settings.gmail_client_id,
        "client_secret": settings.gmail_client_secret,
        "code": code,
        "grant_type": "authorization_code",
        "redirect_uri": settings.gmail_redirect_uri,
    }
    response = requests.post("https://oauth2.googleapis.com/token", data=data)
    response.raise_for_status()
    
    token_response = response.json()
    
    token_data = {
        "token": token_response.get("access_token"),
        "refresh_token": token_response.get("refresh_token"),
        "token_uri": "https://oauth2.googleapis.com/token",
        "client_id": settings.gmail_client_id,
        "client_secret": settings.gmail_client_secret,
        "scopes": SCOPES,
    }

    with open(TOKEN_FILE, "w") as f:
        json.dump(token_data, f)
    return token_data


def _get_credentials() -> Credentials | None:
    if not os.path.exists(TOKEN_FILE):
        return None
    with open(TOKEN_FILE) as f:
        data = json.load(f)
    creds = Credentials(
        token=data["token"],
        refresh_token=data.get("refresh_token"),
        token_uri=data.get("token_uri", "https://oauth2.googleapis.com/token"),
        client_id=data.get("client_id"),
        client_secret=data.get("client_secret"),
        scopes=data.get("scopes"),
    )
    if creds.expired and creds.refresh_token:
        creds.refresh(Request())
        data["token"] = creds.token
        with open(TOKEN_FILE, "w") as f:
            json.dump(data, f)
    return creds


async def poll_gmail_for_invoices():
    creds = _get_credentials()
    if not creds:
        return

    service = build("gmail", "v1", credentials=creds)
    db = get_supabase()

    query = "has:attachment (filename:pdf OR filename:jpg OR filename:png) subject:(invoice OR bill) is:unread"
    results = service.users().messages().list(userId="me", q=query, maxResults=20).execute()
    messages = results.get("messages", [])

    for msg_ref in messages:
        msg = service.users().messages().get(userId="me", id=msg_ref["id"], format="full").execute()
        await _process_email_message(msg, service, db)
        service.users().messages().modify(
            userId="me", id=msg_ref["id"], body={"removeLabelIds": ["UNREAD"]}
        ).execute()


async def _process_email_message(msg: dict, service, db):
    from app.services.gemini import extract_invoice_data

    headers = {h["name"]: h["value"] for h in msg["payload"].get("headers", [])}
    sender_email = headers.get("From", "")
    subject = headers.get("Subject", "")

    parts = _get_parts(msg["payload"])
    for part in parts:
        mime = part.get("mimeType", "")
        filename = part.get("filename", "")
        if not filename or mime not in ["application/pdf", "image/jpeg", "image/png", "image/jpg"]:
            continue

        attachment_id = part.get("body", {}).get("attachmentId")
        if not attachment_id:
            continue

        att = service.users().messages().attachments().get(
            userId="me", messageId=msg["id"], id=attachment_id
        ).execute()
        file_bytes = base64.urlsafe_b64decode(att["data"])

        existing = db.table("invoices").select("id").eq("gmail_message_id", msg["id"]).execute()
        if existing.data:
            continue

        storage_path = f"invoices/email_{msg['id']}_{filename}"
        db.storage.from_("invoices").upload(storage_path, file_bytes)
        file_url = db.storage.from_("invoices").get_public_url(storage_path)

        invoice_res = db.table("invoices").insert({
            "source": "email",
            "raw_file_url": file_url,
            "status": "processing",
            "gmail_message_id": msg["id"],
            "sender_email": sender_email,
            "email_subject": subject,
        }).execute()

        invoice_id = invoice_res.data[0]["id"]

        try:
            extracted = await extract_invoice_data(file_bytes, filename)
            db.table("invoices").update({
                "extracted_data": extracted.model_dump(),
                "invoice_number": extracted.invoice_number,
                "po_number": extracted.po_number,
                "total": extracted.total,
                "status": "extracted",
            }).eq("id", invoice_id).execute()

            from app.services.matcher import run_matching
            await run_matching(invoice_id)
        except Exception as e:
            db.table("invoices").update({"status": "exception"}).eq("id", invoice_id).execute()
            db.table("exceptions").insert({
                "invoice_id": invoice_id,
                "reason": f"Extraction failed: {str(e)}",
                "status": "open",
            }).execute()


def _get_parts(payload: dict) -> list:
    parts = []
    if "parts" in payload:
        for part in payload["parts"]:
            parts.extend(_get_parts(part))
    else:
        parts.append(payload)
    return parts
