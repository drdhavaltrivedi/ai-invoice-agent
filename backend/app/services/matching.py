from app.core.supabase import get_supabase
from app.services.embeddings import generate_embedding, generate_invoice_search_string

async def find_best_po_match(invoice_data: dict) -> dict | None:
    """
    Uses vector similarity search (via Supabase pgvector) to find the 
    most semantically similar Purchase Order for the given invoice data.
    """
    try:
        # 1. Generate search string and embedding for the invoice
        search_str = generate_invoice_search_string(invoice_data)
        embedding = generate_embedding(search_str)
        
        db = get_supabase()
        
        # 2. Call the Supabase RPC function for vector similarity search
        # Note: You must create this 'match_purchase_orders' function in your Supabase SQL editor first.
        # We search for open POs that are most similar.
        result = db.rpc(
            "match_purchase_orders",
            {
                "query_embedding": embedding,
                "match_threshold": 0.5, # Adjust based on testing
                "match_count": 1
            }
        ).execute()
        
        if result.data and len(result.data) > 0:
            best_match = result.data[0]
            print(f"[Matcher] Found semantic match: PO {best_match.get('po_number')} (Similarity: {best_match.get('similarity')})")
            return best_match
            
        return None
    except Exception as e:
        print(f"[Matcher] Error during semantic matching: {e}")
        return None
