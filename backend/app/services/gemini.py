import json
import re
import asyncio
from pathlib import Path

from google import genai
from google.genai import types

from app.core.config import settings
from app.models.schemas import ExtractedInvoiceData

_clients: dict[str, genai.Client] = {}

# ──────────────────────────────────────────────────────────
# Strategy 1: Model Cascade — try every known model variant
# ──────────────────────────────────────────────────────────
MODEL_CASCADE = [
    "gemini-2.0-flash",          # Primary: fast multimodal
    "gemini-2.0-flash-lite",     # Lightweight, lower quota cost
    "gemini-2.0-flash-exp",      # Experimental variant
    "gemini-1.5-flash",          # Older stable flash
    "gemini-1.5-pro",            # High-capacity reasoning
    "gemini-pro",                # Legacy model
    "gemini-pro-vision",         # Legacy vision model
]

# ──────────────────────────────────────────────────────────
# Strategy 2: API Version Rotation — v1 and v1beta may have
#             separate rate limit pools
# ──────────────────────────────────────────────────────────
API_VERSIONS = ["v1beta", "v1"]

# ──────────────────────────────────────────────────────────
# Strategy 3: Multi-Key Support — use a backup key if available
# ──────────────────────────────────────────────────────────
# Set GEMINI_API_KEY_BACKUP in .env for an additional key

# Last successful combination (cached to try first)
_last_success: dict = {"model": None, "api_version": None, "key": None}

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


def _get_api_keys() -> list[str]:
    """Return all available API keys (primary + backup)."""
    keys = []
    if settings.gemini_api_key:
        keys.append(settings.gemini_api_key)
    # Support backup key from environment
    import os
    backup = os.getenv("GEMINI_API_KEY_BACKUP")
    if backup:
        keys.append(backup)
    return keys


def _get_client(api_key: str, api_version: str = "v1beta") -> genai.Client:
    """Get or create a cached client for a specific key + version combo."""
    cache_key = f"{api_key[:8]}_{api_version}"
    if cache_key not in _clients:
        _clients[cache_key] = genai.Client(
            api_key=api_key,
            http_options={"api_version": api_version},
        )
    return _clients[cache_key]


def _build_parts(file_bytes: bytes, filename: str) -> list:
    """Build the multimodal parts list from the uploaded file."""
    suffix = Path(filename).suffix.lower()
    parts: list = [EXTRACTION_PROMPT]

    mime_map = {
        ".pdf": "application/pdf",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
    }
    mime = mime_map.get(suffix, "image/jpeg")
    parts.append(types.Part.from_bytes(data=file_bytes, mime_type=mime))
    return parts


def _parse_response(raw_text: str) -> ExtractedInvoiceData:
    """Parse the raw Gemini response into structured data."""
    raw = raw_text.strip()
    raw = re.sub(r"```json\s*", "", raw)
    raw = re.sub(r"```\s*", "", raw)
    data = json.loads(raw)
    return ExtractedInvoiceData(**data)


async def _try_extraction(
    client: genai.Client,
    model: str,
    parts: list,
    api_version: str,
    key_label: str,
) -> ExtractedInvoiceData | None:
    """
    Attempt extraction with a single model + client combo.
    Returns result on success, None on failure.
    Retries up to 3 times with backoff for rate limits.
    """
    for attempt in range(3):
        try:
            print(f"[Gemini] Trying {model} via {api_version} (key={key_label}, attempt={attempt+1})")
            response = client.models.generate_content(
                model=model,
                contents=parts,
            )
            result = _parse_response(response.text)
            print(f"[Gemini] ✓ SUCCESS with {model} via {api_version}")

            # Cache this working combination
            global _last_success
            _last_success = {"model": model, "api_version": api_version, "key": key_label}

            return result

        except Exception as e:
            error_str = str(e)
            is_rate_limit = "429" in error_str or "RESOURCE_EXHAUSTED" in error_str
            is_not_found = "404" in error_str or "NOT_FOUND" in error_str

            if is_not_found:
                print(f"[Gemini] ✗ {model} not available via {api_version}. Skipping.")
                return None  # Don't retry — model doesn't exist

            if is_rate_limit:
                wait = (2 ** attempt) * 5  # 5s, 10s, 20s
                print(f"[Gemini] ⏳ Rate limited on {model}. Waiting {wait}s...")
                await asyncio.sleep(wait)
                continue  # Retry same model

            # Other errors (500, parse errors, etc.)
            print(f"[Gemini] ✗ {model} error: {error_str[:120]}")
            return None

    return None  # All retries exhausted for this model


async def extract_invoice_data(file_bytes: bytes, filename: str) -> ExtractedInvoiceData:
    """
    Multi-strategy extraction pipeline:
      1. Try the last successful model/key/version combo (cached)
      2. Cascade through all models × API versions × API keys
      3. Retry with backoff on rate limits
    """
    parts = _build_parts(file_bytes, filename)
    api_keys = _get_api_keys()

    # ── Strategy 0: Try the last working combo first ──
    if _last_success["model"]:
        ls = _last_success
        for key in api_keys:
            key_label = key[:8] + "..."
            client = _get_client(key, ls["api_version"])
            result = await _try_extraction(client, ls["model"], parts, ls["api_version"], key_label)
            if result:
                return result
        print("[Gemini] Last-success cache miss. Running full cascade...")

    # ── Strategy 1-3: Full cascade ──
    attempts = 0
    last_error = None

    for key in api_keys:
        key_label = key[:8] + "..."
        for api_version in API_VERSIONS:
            client = _get_client(key, api_version)
            for model in MODEL_CASCADE:
                attempts += 1
                try:
                    result = await _try_extraction(client, model, parts, api_version, key_label)
                    if result:
                        return result
                except Exception as e:
                    last_error = e

    # ── Strategy 4: Local OCR fallback — no API needed ──
    print("[Gemini] All AI models failed. Falling back to local OCR extraction...")
    try:
        from app.services.ocr_extractor import extract_with_ocr
        result = extract_with_ocr(file_bytes, filename)
        if result:
            print("[Gemini] ✓ Local OCR extraction succeeded (lower confidence)")
            return result
    except Exception as ocr_error:
        print(f"[Gemini] ✗ Local OCR also failed: {ocr_error}")

    # Everything failed
    total_combos = len(api_keys) * len(API_VERSIONS) * len(MODEL_CASCADE)
    raise ValueError(
        f"All {total_combos} AI model combinations + local OCR failed after {attempts} attempts. "
        f"Models: {MODEL_CASCADE}. "
        f"Last AI error: {last_error}. "
        f"Tip: Check your API quota at https://aistudio.google.com/apikey"
    )
