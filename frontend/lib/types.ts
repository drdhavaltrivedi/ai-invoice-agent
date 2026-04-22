export type InvoiceStatus =
  | "received"
  | "processing"
  | "extracted"
  | "matched"
  | "exception"
  | "approved"
  | "posted"
  | "rejected";

export type InvoiceSource = "email" | "upload";

export interface LineItem {
  description: string;
  qty: number;
  rate: number;
  amount: number;
  tax?: number;
}

export interface ExtractedData {
  vendor_name?: string;
  invoice_number?: string;
  invoice_date?: string;
  po_number?: string;
  line_items: LineItem[];
  subtotal?: number;
  tax?: number;
  total?: number;
  confidence_score?: number;
  low_confidence_fields?: string[];
}

export interface Invoice {
  id: string;
  vendor_id?: string;
  invoice_number?: string;
  invoice_date?: string;
  po_number?: string;
  total?: number;
  source: InvoiceSource;
  status: InvoiceStatus;
  raw_file_url?: string;
  original_filename?: string;
  extracted_data?: ExtractedData;
  sender_email?: string;
  email_subject?: string;
  created_at: string;
  updated_at: string;
  vendors?: { name: string; email?: string; gstin?: string };
  exceptions?: Exception[];
  invoice_matches?: InvoiceMatch[];
}

export interface Exception {
  id: string;
  invoice_id: string;
  reason: string;
  status: "open" | "resolved" | "rejected";
  resolution_notes?: string;
  created_at: string;
  invoices?: Invoice;
}

export interface InvoiceMatch {
  id: string;
  invoice_id: string;
  grn_id?: string;
  po_id?: string;
  match_score?: number;
  match_status: "auto_matched" | "partial" | "unmatched" | "exception";
  purchase_orders?: { po_number: string };
  grns?: { grn_number: string };
}

export interface Vendor {
  id: string;
  name: string;
  email?: string;
  gstin?: string;
  bank_name?: string;
  bank_account?: string;
  bank_ifsc?: string;
  created_at: string;
}

export interface PurchaseOrder {
  id: string;
  vendor_id: string;
  po_number: string;
  po_date?: string;
  expected_delivery?: string;
  line_items: LineItem[];
  total_amount: number;
  status: "open" | "received" | "closed" | "cancelled";
  notes?: string;
  created_at: string;
  vendors?: { name: string; email?: string };
}

export interface GRN {
  id: string;
  po_id: string;
  grn_number: string;
  received_date?: string;
  items_received: any[];
  status: "received" | "partial" | "matched";
  notes?: string;
  created_at: string;
  purchase_orders?: { po_number: string; vendors?: { name: string } };
}

export interface Notification {
  id: string;
  user_id: string;
  message: string;
  type: string;
  invoice_id?: string;
  read: boolean;
  created_at: string;
}

export interface Stats {
  total: number;
  by_status: Record<InvoiceStatus, number>;
  open_exceptions: number;
}
