"""
Local OCR-based invoice extraction — zero API cost, no quota limits.
Uses pdfplumber for text-based PDFs and pytesseract for scanned images.
Falls back to regex pattern matching to extract structured invoice data.
"""

import re
import io
from pathlib import Path
from datetime import datetime

from app.models.schemas import ExtractedInvoiceData


def _extract_text_from_pdf(file_bytes: bytes) -> str:
    """Extract text from a PDF using pdfplumber (works for text-based PDFs)."""
    try:
        import pdfplumber
        text_parts = []
        with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
            for page in pdf.pages[:5]:  # Limit to first 5 pages
                page_text = page.extract_text()
                if page_text:
                    text_parts.append(page_text)
        return "\n".join(text_parts)
    except Exception as e:
        print(f"[OCR] pdfplumber failed: {e}")
        return ""


def _extract_text_from_image(file_bytes: bytes) -> str:
    """Extract text from an image using pytesseract OCR."""
    try:
        import pytesseract
        from PIL import Image
        image = Image.open(io.BytesIO(file_bytes))
        return pytesseract.image_to_string(image)
    except Exception as e:
        print(f"[OCR] pytesseract failed: {e}")
        return ""


def _find_pattern(text: str, patterns: list[str]) -> str | None:
    """Try multiple regex patterns and return the first match."""
    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE | re.MULTILINE)
        if match:
            return match.group(1).strip()
    return None


def _find_amount(text: str, patterns: list[str]) -> float | None:
    """Find a monetary amount using regex patterns."""
    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE | re.MULTILINE)
        if match:
            raw = match.group(1).replace(",", "").replace(" ", "")
            try:
                return float(raw)
            except ValueError:
                continue
    return None


def _parse_date(date_str: str) -> str | None:
    """Try to parse a date string into YYYY-MM-DD format."""
    date_formats = [
        "%d/%m/%Y", "%m/%d/%Y", "%d-%m-%Y", "%m-%d-%Y",
        "%d.%m.%Y", "%Y-%m-%d", "%d %b %Y", "%d %B %Y",
        "%b %d, %Y", "%B %d, %Y", "%d-%b-%Y", "%d-%B-%Y",
    ]
    for fmt in date_formats:
        try:
            return datetime.strptime(date_str, fmt).strftime("%Y-%m-%d")
        except ValueError:
            continue
    return None


def _extract_line_items(text: str) -> list[dict]:
    """Attempt to extract line items from tabular data in the text."""
    items = []
    # Pattern: description followed by quantity, rate, amount
    # e.g., "Widget A    10    500.00    5000.00"
    pattern = r"([A-Za-z][A-Za-z0-9\s\-/]+?)\s+(\d+(?:\.\d+)?)\s+[\₹$]?\s*([\d,]+(?:\.\d{2})?)\s+[\₹$]?\s*([\d,]+(?:\.\d{2})?)"
    matches = re.findall(pattern, text)
    for match in matches:
        desc, qty, rate, amount = match
        desc = desc.strip()
        if len(desc) > 3 and not any(skip in desc.lower() for skip in [
            "total", "subtotal", "tax", "gst", "cgst", "sgst", "igst",
            "invoice", "date", "number", "bill", "page", "qty", "rate",
            "amount", "description", "particular", "serial",
        ]):
            try:
                items.append({
                    "description": desc,
                    "qty": float(qty),
                    "rate": float(rate.replace(",", "")),
                    "amount": float(amount.replace(",", "")),
                    "tax": 0,
                })
            except ValueError:
                continue
    return items[:20]  # Cap at 20 items


def extract_with_ocr(file_bytes: bytes, filename: str) -> ExtractedInvoiceData:
    """
    Extract invoice data using local OCR — no API needed.
    Works best with text-based PDFs. Scanned image support requires
    tesseract to be installed on the system.
    """
    suffix = Path(filename).suffix.lower()
    print(f"[OCR] Starting local extraction for {filename} ({suffix})")

    # Step 1: Extract raw text
    if suffix == ".pdf":
        text = _extract_text_from_pdf(file_bytes)
        if not text:
            print("[OCR] Text PDF extraction failed, trying image OCR on PDF...")
            # Try converting PDF pages to images and OCR them
            try:
                from pdf2image import convert_from_bytes
                pages = convert_from_bytes(file_bytes, dpi=200, fmt="jpeg")
                parts = []
                for page in pages[:3]:
                    buf = io.BytesIO()
                    page.save(buf, format="JPEG")
                    parts.append(_extract_text_from_image(buf.getvalue()))
                text = "\n".join(parts)
            except Exception:
                text = ""
    else:
        text = _extract_text_from_image(file_bytes)

    if not text or len(text.strip()) < 10:
        raise ValueError("OCR could not extract any text from the document.")

    print(f"[OCR] Extracted {len(text)} characters of text")

    # Step 2: Pattern-match to extract fields
    vendor_name = _find_pattern(text, [
        r"(?:from|vendor|supplier|company|billed?\s*by|sold\s*by)[:\s]+([A-Z][A-Za-z0-9\s&.,\-]+)",
        r"^([A-Z][A-Z\s&.,\-]{3,40})$",  # First capitalized line as vendor
    ])

    invoice_number = _find_pattern(text, [
        r"(?:invoice|inv|bill)\s*(?:no|number|#|num)[.:\s]*([A-Za-z0-9\-/]+)",
        r"(?:invoice|inv)\s*[.:\s]*([A-Za-z0-9\-/]+)",
        r"(?:ref|reference)\s*(?:no|number|#)?[.:\s]*([A-Za-z0-9\-/]+)",
    ])

    invoice_date_raw = _find_pattern(text, [
        r"(?:invoice|inv|bill)?\s*date[:\s]*(\d{1,2}[\-/\.]\d{1,2}[\-/\.]\d{2,4})",
        r"(?:date)[:\s]*(\d{1,2}\s+\w+\s+\d{4})",
        r"(\d{1,2}[\-/\.]\d{1,2}[\-/\.]\d{4})",
    ])
    invoice_date = _parse_date(invoice_date_raw) if invoice_date_raw else None

    po_number = _find_pattern(text, [
        r"(?:p\.?o\.?|purchase\s*order)\s*(?:no|number|#|num)?[.:\s]*([A-Za-z0-9\-/]+)",
        r"(?:order)\s*(?:no|number|#)?[.:\s]*([A-Za-z0-9\-/]+)",
    ])

    subtotal = _find_amount(text, [
        r"(?:sub\s*total|subtotal)[:\s]*[\₹$]?\s*([\d,]+(?:\.\d{2})?)",
    ])

    tax = _find_amount(text, [
        r"(?:tax|gst|vat|igst|cgst\s*\+\s*sgst)[:\s]*[\₹$]?\s*([\d,]+(?:\.\d{2})?)",
        r"(?:total\s*tax)[:\s]*[\₹$]?\s*([\d,]+(?:\.\d{2})?)",
    ])

    total = _find_amount(text, [
        r"(?:grand\s*total|total\s*(?:amount|due|payable)|net\s*(?:amount|payable)|balance\s*due)[:\s]*[\₹$]?\s*([\d,]+(?:\.\d{2})?)",
        r"(?:total)[:\s]*[\₹$]?\s*([\d,]+(?:\.\d{2})?)",
    ])

    line_items = _extract_line_items(text)

    # Build confidence based on how many fields we found
    fields_found = sum(1 for f in [vendor_name, invoice_number, invoice_date, total] if f)
    confidence = round(fields_found / 4 * 0.7, 2)  # Max 0.7 for OCR

    low_conf_fields = []
    if not vendor_name: low_conf_fields.append("vendor_name")
    if not invoice_number: low_conf_fields.append("invoice_number")
    if not invoice_date: low_conf_fields.append("invoice_date")
    if not total: low_conf_fields.append("total")
    if not line_items: low_conf_fields.append("line_items")

    result = ExtractedInvoiceData(
        vendor_name=vendor_name,
        invoice_number=invoice_number,
        invoice_date=invoice_date,
        po_number=po_number,
        line_items=[{"description": li["description"], "qty": li["qty"], "rate": li["rate"], "amount": li["amount"], "tax": 0} for li in line_items] if line_items else [],
        subtotal=subtotal,
        tax=tax,
        total=total,
        confidence_score=confidence,
        low_confidence_fields=low_conf_fields,
    )

    print(f"[OCR] ✓ Extraction complete. Confidence: {confidence}. Fields found: {fields_found}/4")
    return result
