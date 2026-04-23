from google import genai
from app.core.config import settings

_client: genai.Client | None = None

def get_embeddings_client() -> genai.Client:
    global _client
    if _client is None:
        _client = genai.Client(api_key=settings.gemini_api_key)
    return _client

def generate_embedding(text: str) -> list[float]:
    """
    Generates a vector embedding for the given text using Gemini's text-embedding-004 model.
    """
    client = get_embeddings_client()
    result = client.models.embed_content(
        model="text-embedding-004",
        contents=text,
    )
    # The result contains a list of embeddings (one for each content)
    # Since we passed a single string, we take the first one
    return result.embeddings[0].values

def generate_invoice_search_string(data: dict) -> str:
    """
    Creates a rich search string from invoice data for better semantic matching.
    """
    items = ", ".join([i.get("description", "") for i in data.get("line_items", [])])
    return f"Vendor: {data.get('vendor_name')} | Items: {items} | Total: {data.get('total')}"

def generate_po_search_string(data: dict) -> str:
    """
    Creates a rich search string from PO data for better semantic matching.
    """
    items = ", ".join([i.get("description", "") for i in data.get("line_items", [])])
    return f"Vendor: {data.get('vendor_id')} | Items: {items} | Total: {data.get('total')}"
