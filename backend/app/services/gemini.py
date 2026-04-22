import json
import re
import asyncio
from pathlib import Path

from google import genai
from google.genai import types

from app.core.config import settings
from app.models.schemas import ExtractedInvoiceData

_client: genai.Client | None = None

# Ordered list of models to try — first success wins.
# Only includes models confirmed available for the current API key.
MODEL_CASCADE = [
    "gemini-2.0-flash",          # Primary: fast multimodal, PDF-native
    "gemini-2.0-flash-lite",     # Fallback: lightweight, lower quota cost
]

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

    # Try each model in the cascade with retry for rate limits
    last_error = None

    for model_name in MODEL_CASCADE:
        # Retry up to 3 times per model with exponential backoff for rate limits
        for attempt in range(3):
            try:
                print(f"[Gemini] Attempting extraction with {model_name} (attempt {attempt + 1})")
                response = client.models.generate_content(
                    model=model_name,
                    contents=parts,
                )

                raw = response.text.strip()
                raw = re.sub(r"```json\s*", "", raw)
                raw = re.sub(r"```\s*", "", raw)

                data = json.loads(raw)
                print(f"[Gemini] ✓ Extraction successful with {model_name}")
                return ExtractedInvoiceData(**data)

            except Exception as e:
                last_error = e
                error_str = str(e)
                print(f"[Gemini] ✗ {model_name} attempt {attempt + 1} failed: {error_str[:120]}")

                # If rate limited (429), wait and retry the same model
                if "429" in error_str or "RESOURCE_EXHAUSTED" in error_str:
                    wait_time = (2 ** attempt) * 5  # 5s, 10s, 20s
                    print(f"[Gemini] Rate limited. Waiting {wait_time}s before retry...")
                    await asyncio.sleep(wait_time)
                    continue
                else:
                    # For non-rate-limit errors (404, etc.), skip to next model
                    break

    # All models and retries failed
    raise ValueError(
        f"All Gemini models failed after retries. "
        f"Models tried: {MODEL_CASCADE}. "
        f"Last error: {last_error}"
    )
