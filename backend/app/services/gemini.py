import base64
import json
import re
import io
from pathlib import Path

from google import genai
from google.genai import types

from app.core.config import settings
from app.models.schemas import ExtractedInvoiceData

_client: genai.Client | None = None

MODEL_PRIMARY = "gemini-2.0-flash"
MODEL_FALLBACK = "gemini-1.5-pro-latest"

EXTRACTION_PROMPT = """
You are an expert invoice data extraction system. Analyze the provided invoice image and extract all relevant information.

Return a JSON object with EXACTLY this structure (no markdown, no explanation, just raw JSON):
{
  "vendor_name": "string or null",
  "invoice_number": "string or null",
  "invoice_date": "YYYY-MM-DD format or null",
  "po_number": "string or null",
  "line_items": [
    {
      "description": "string",
      "qty": number,
      "rate": number,
      "amount": number,
      "tax": number
    }
  ],
  "subtotal": number or null,
  "tax": number or null,
  "total": number or null,
  "confidence_score": number between 0 and 1,
  "low_confidence_fields": ["list of field names where you are less than 80% confident"]
}

Rules:
- All monetary values must be plain numbers (no currency symbols, no commas)
- If a field is not found or unclear, use null
- confidence_score reflects overall extraction quality (0.0 = very uncertain, 1.0 = very certain)
- Be precise — extract exact values shown on the invoice
"""


def _get_client() -> genai.Client:
    global _client
    if _client is None:
        _client = genai.Client(api_key=settings.gemini_api_key)
    return _client

async def extract_invoice_data(file_bytes: bytes, filename: str) -> ExtractedInvoiceData:
    client = _get_client()
    suffix = Path(filename).suffix.lower()

    parts: list = [EXTRACTION_PROMPT]
    
    if suffix == ".pdf":
        parts.append(types.Part.from_bytes(data=file_bytes, mime_type="application/pdf"))
    elif suffix in [".jpg", ".jpeg"]:
        parts.append(types.Part.from_bytes(data=file_bytes, mime_type="image/jpeg"))
    elif suffix == ".png":
        parts.append(types.Part.from_bytes(data=file_bytes, mime_type="image/png"))
    else:
        parts.append(types.Part.from_bytes(data=file_bytes, mime_type="image/jpeg"))

    try:
        # Try primary model first
        response = client.models.generate_content(
            model=MODEL_PRIMARY,
            contents=parts,
        )
    except Exception as e:
        print(f"Primary model {MODEL_PRIMARY} failed: {e}. Retrying with fallback {MODEL_FALLBACK}...")
        # Fallback to high-capacity model
        response = client.models.generate_content(
            model=MODEL_FALLBACK,
            contents=parts,
        )

    raw = response.text.strip()
    raw = re.sub(r"```json\s*", "", raw)
    raw = re.sub(r"```\s*", "", raw)

    data = json.loads(raw)
    return ExtractedInvoiceData(**data)
