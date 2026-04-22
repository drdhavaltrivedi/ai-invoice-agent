"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import Header from "@/components/layout/header";
import { Invoice } from "@/lib/types";
import StatusBadge from "@/components/invoices/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, ExternalLink, AlertTriangle, Save, Brain, Sparkles, CheckCircle, RotateCcw } from "lucide-react";
import Link from "next/link";
import { use, useState, useEffect } from "react";
import { toast } from "sonner";

export default function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const qc = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [learnFromThis, setLearnFromThis] = useState(true);
  const [formData, setFormData] = useState<any>(null);

  const { data: invoice, isLoading } = useQuery<Invoice>({
    queryKey: ["invoice", id],
    queryFn: () => api.invoices.get(id),
  });

  useEffect(() => {
    if (invoice?.extracted_data) {
      setFormData({
        vendor_name: invoice.extracted_data.vendor_name || "",
        invoice_number: invoice.extracted_data.invoice_number || invoice.invoice_number || "",
        invoice_date: invoice.extracted_data.invoice_date || "",
        po_number: invoice.extracted_data.po_number || invoice.po_number || "",
        subtotal: invoice.extracted_data.subtotal?.toString() || "",
        tax: invoice.extracted_data.tax?.toString() || "",
        total: invoice.extracted_data.total?.toString() || invoice.total?.toString() || "",
      });
    }
  }, [invoice]);

  const updateMutation = useMutation({
    mutationFn: (payload: { data: any, learn: boolean }) => api.invoices.update(id, { 
      extracted_data: payload.data,
      run_matching: true,
      learn: payload.learn
    }),
    onSuccess: () => {
      toast.success("Invoice updated and re-matched");
      qc.invalidateQueries({ queryKey: ["invoice", id] });
      setIsEditing(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const handleSave = () => {
    const updated = {
      ...invoice?.extracted_data,
      vendor_name: formData.vendor_name || null,
      invoice_number: formData.invoice_number || null,
      invoice_date: formData.invoice_date || null,
      po_number: formData.po_number || null,
      subtotal: formData.subtotal ? parseFloat(formData.subtotal) : null,
      tax: formData.tax ? parseFloat(formData.tax) : null,
      total: formData.total ? parseFloat(formData.total) : null,
    };
    
    updateMutation.mutate({ data: updated, learn: learnFromThis });
  };

  if (isLoading) return <div className="flex-1 p-6 flex items-center justify-center text-gray-400">Loading...</div>;
  if (!invoice) return <div className="flex-1 p-6 text-gray-400">Invoice not found</div>;

  const isPdf = invoice.raw_file_url?.toLowerCase().endsWith(".pdf");

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-gray-50/30">
      <Header title="Invoice Verification Workbench" />
      
      {/* Action Bar */}
      <div className="bg-white border-b px-8 py-3 flex items-center justify-between shadow-sm z-10">
        <div className="flex items-center gap-6">
          <Link href="/invoices">
            <Button variant="ghost" size="sm" className="hover:bg-gray-100 text-gray-500 font-bold group h-9">
              <ArrowLeft className="h-4 w-4 mr-1.5 group-hover:-translate-x-1 transition-transform" /> 
              Exit
            </Button>
          </Link>
          <div className="h-6 w-px bg-gray-200" />
          <div className="flex flex-col">
            <div className="flex items-center gap-3">
              <span className="text-sm font-black text-gray-900 tracking-tight">#{invoice.invoice_number || "Draft"}</span>
              <StatusBadge status={invoice.status} />
            </div>
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">ID: {id.slice(0, 8)}</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 px-4 py-2 bg-blue-50 rounded-xl border border-blue-100">
            <Brain className="h-4 w-4 text-blue-600" />
            <span className="text-xs font-bold text-blue-700">AI Learning</span>
            <button
              onClick={() => setLearnFromThis(!learnFromThis)}
              className={`w-9 h-5 rounded-full transition-colors relative ${learnFromThis ? "bg-blue-600" : "bg-gray-300"}`}
            >
              <div className={`w-3.5 h-3.5 bg-white rounded-full shadow transition-transform absolute top-0.75 left-0.75 ${learnFromThis ? "translate-x-4" : ""}`} />
            </button>
          </div>
          
          <Button 
            className="bg-gray-900 text-white font-bold h-9 px-6 rounded-xl shadow-lg shadow-gray-200 active:scale-95 transition-all"
            onClick={handleSave}
            disabled={updateMutation.isPending}
          >
            {updateMutation.isPending ? (
              <><RotateCcw className="h-4 w-4 mr-2 animate-spin" /> Matching...</>
            ) : (
              <><Save className="h-4 w-4 mr-2" /> Save & Match</>
            )}
          </Button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* LEFT: Data Pane */}
        <div className="w-[45%] overflow-y-auto bg-white border-r p-8 space-y-8 scrollbar-hide">
          
          {invoice.exceptions && invoice.exceptions.filter(e => e.status === "open").map((exc) => (
            <div key={exc.id} className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex gap-4 animate-in fade-in zoom-in duration-300">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-amber-900 text-sm">Action Required</p>
                <p className="text-xs text-amber-800/80 leading-relaxed mt-1">{exc.reason}</p>
              </div>
            </div>
          ))}

          <section className="space-y-6">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">General Information</h3>
            <div className="grid grid-cols-2 gap-6">
              <div className="col-span-2 space-y-2">
                <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                  Vendor Name
                  {(invoice.extracted_data?.confidence_score ?? 0) < 0.8 && <Sparkles className="h-3 w-3 text-amber-500" />}
                </Label>
                <Input 
                  value={formData?.vendor_name} 
                  onChange={e => setFormData({...formData, vendor_name: e.target.value})}
                  className="bg-gray-50/50 border-gray-100 font-bold focus:bg-white transition-colors"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Invoice Number</Label>
                <Input 
                  value={formData?.invoice_number} 
                  onChange={e => setFormData({...formData, invoice_number: e.target.value})}
                  className="bg-gray-50/50 border-gray-100 font-bold focus:bg-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Document Date</Label>
                <Input 
                  type="date"
                  value={formData?.invoice_date} 
                  onChange={e => setFormData({...formData, invoice_date: e.target.value})}
                  className="bg-gray-50/50 border-gray-100 font-bold focus:bg-white"
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">PO Reference (System Match)</Label>
                <div className="relative">
                  <Input 
                    value={formData?.po_number} 
                    onChange={e => setFormData({...formData, po_number: e.target.value})}
                    className={`bg-gray-50/50 border-gray-100 font-bold focus:bg-white pl-10 ${
                      !formData?.po_number ? "border-amber-200 bg-amber-50/30" : "border-green-100 bg-green-50/10"
                    }`}
                  />
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2">
                    {formData?.po_number ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-6 pt-8 border-t">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Financial Totals</h3>
            <div className="grid grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Subtotal</Label>
                <Input 
                  value={formData?.subtotal} 
                  onChange={e => setFormData({...formData, subtotal: e.target.value})}
                  className="bg-gray-50/50 border-gray-100 font-black text-gray-700"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Tax Amount</Label>
                <Input 
                  value={formData?.tax} 
                  onChange={e => setFormData({...formData, tax: e.target.value})}
                  className="bg-gray-50/50 border-gray-100 font-black text-gray-700"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Grand Total</Label>
                <Input 
                  value={formData?.total} 
                  onChange={e => setFormData({...formData, total: e.target.value})}
                  className="bg-blue-50 border-blue-100 font-black text-blue-700 focus:bg-white"
                />
              </div>
            </div>
          </section>

          {invoice.invoice_matches && invoice.invoice_matches.length > 0 && (
            <section className="space-y-6 pt-8 border-t">
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">ERP Reconciliation Status</h3>
              <div className="bg-gray-900 rounded-3xl p-6 text-white space-y-6">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">3-Way Match Result</span>
                  <Badge className="bg-white/10 text-white border-0 text-[10px] font-black uppercase tracking-wider">
                    {invoice.invoice_matches[0].match_status.replace("_", " ")}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">PO Linked</p>
                    <p className="text-lg font-black">{invoice.invoice_matches[0].purchase_orders?.po_number || "—"}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">GRN Verified</p>
                    <p className="text-lg font-black">{invoice.invoice_matches[0].grns?.grn_number || "—"}</p>
                  </div>
                </div>
              </div>
            </section>
          )}
        </div>

        {/* RIGHT: Document Pane */}
        <div className="flex-1 bg-gray-200 relative group">
          <div className="absolute inset-0 flex items-center justify-center">
            {isPdf ? (
              <iframe 
                src={`${invoice.raw_file_url}#toolbar=0&navpanes=0`}
                className="w-full h-full border-none shadow-2xl"
                title="Invoice Document"
              />
            ) : (
              <div className="w-full h-full p-8 overflow-auto flex items-start justify-center">
                <img 
                  src={invoice.raw_file_url} 
                  alt="Invoice" 
                  className="max-w-full h-auto shadow-2xl rounded-lg"
                />
              </div>
            )}
          </div>
          
          {/* Floating Controls */}
          <div className="absolute top-6 right-6 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <a href={invoice.raw_file_url} target="_blank" rel="noreferrer">
              <Button size="sm" className="bg-white/90 backdrop-blur text-gray-900 font-bold hover:bg-white shadow-xl">
                <ExternalLink className="h-4 w-4 mr-2" /> Open Full
              </Button>
            </a>
          </div>

          {/* Confidence Indicator Overlay */}
          <div className="absolute bottom-6 left-6">
            <div className="bg-white/90 backdrop-blur rounded-2xl p-4 shadow-xl border border-white/50">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Extraction Quality</p>
              <div className="flex items-center gap-3">
                <div className="h-2 w-32 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-1000 ${
                      (invoice.extracted_data?.confidence_score || 0) > 0.8 ? "bg-green-500" : "bg-amber-500"
                    }`}
                    style={{ width: `${Math.round((invoice.extracted_data?.confidence_score || 0) * 100)}%` }}
                  />
                </div>
                <span className="font-black text-sm text-gray-900">
                  {Math.round((invoice.extracted_data?.confidence_score || 0) * 100)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
