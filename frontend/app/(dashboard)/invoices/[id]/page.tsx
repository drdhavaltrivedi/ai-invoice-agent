"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import Header from "@/components/layout/header";
import { Invoice } from "@/lib/types";
import StatusBadge from "@/components/invoices/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ExternalLink, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { use } from "react";

export default function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: invoice, isLoading } = useQuery<Invoice>({
    queryKey: ["invoice", id],
    queryFn: () => api.invoices.get(id),
  });

  if (isLoading) return <div className="flex-1 p-6 flex items-center justify-center text-gray-400">Loading...</div>;
  if (!invoice) return <div className="flex-1 p-6 text-gray-400">Invoice not found</div>;

  const ext = invoice.extracted_data;

  return (
    <div className="flex flex-col flex-1 bg-gray-50/30">
      <Header title="Invoice Processing Details" />
      <div className="p-8 space-y-8 max-w-6xl mx-auto w-full">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/invoices">
              <Button variant="ghost" size="sm" className="hover:bg-white text-gray-500 font-semibold group">
                <ArrowLeft className="h-4 w-4 mr-1.5 group-hover:-translate-x-1 transition-transform" /> 
                Back to Invoices
              </Button>
            </Link>
            <div className="h-6 w-px bg-gray-200" />
            <StatusBadge status={invoice.status} />
            {invoice.invoice_number && <span className="text-gray-900 font-black tracking-tight text-lg">#{invoice.invoice_number}</span>}
          </div>
        </div>

        {invoice.exceptions && invoice.exceptions.filter(e => e.status === "open").map((exc) => (
          <div key={exc.id} className="bg-amber-50 border border-amber-200 rounded-2xl p-6 flex gap-4 shadow-sm animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="font-bold text-amber-900 text-lg">Processing Exception Detected</p>
              <p className="text-sm text-amber-800/80 leading-relaxed max-w-2xl">{exc.reason}</p>
              <div className="mt-4 flex gap-3">
                <Link href="/exceptions">
                  <Button variant="outline" className="bg-white border-amber-200 text-amber-700 hover:bg-amber-100 font-bold px-6">
                    Review in Exceptions Queue
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        ))}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-8 space-y-8">
            <Card className="border-none shadow-xl shadow-gray-200/50 rounded-3xl overflow-hidden">
              <CardHeader className="bg-white border-b pb-6">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-xl font-black text-gray-900 tracking-tight">Extracted Metadata</CardTitle>
                  <Button variant="secondary" size="sm" className="text-xs font-bold uppercase tracking-widest bg-gray-100">
                    Edit Data
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-8">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
                  {[
                    ["Vendor Name", ext?.vendor_name],
                    ["Document Date", ext?.invoice_date],
                    ["Invoice #", ext?.invoice_number],
                    ["PO Reference", ext?.po_number],
                  ].map(([label, value]) => (
                    <div key={label as string} className="space-y-1">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{label}</p>
                      <p className="font-bold text-gray-900 leading-none">{value ?? "—"}</p>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-8 pt-8 border-t border-gray-100">
                  {[
                    ["Subtotal", ext?.subtotal ? `₹${ext.subtotal.toLocaleString()}` : null],
                    ["Tax Amount", ext?.tax ? `₹${ext.tax.toLocaleString()}` : null],
                    ["Grand Total", ext?.total ? `₹${ext.total.toLocaleString()}` : null],
                    ["Confidence", ext?.confidence_score ? `${Math.round(ext.confidence_score * 100)}%` : null],
                  ].map(([label, value]) => (
                    <div key={label as string} className="space-y-1">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{label}</p>
                      <p className={`font-black text-lg leading-none ${label === "Grand Total" ? "text-blue-600" : "text-gray-900"}`}>
                        {value ?? "—"}
                      </p>
                    </div>
                  ))}
                </div>

                {ext?.low_confidence_fields && ext.low_confidence_fields.length > 0 && (
                  <div className="mt-10 p-4 bg-amber-50/50 rounded-2xl border border-amber-100">
                    <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-3">Validation Required</p>
                    <div className="flex gap-2 flex-wrap">
                      {ext.low_confidence_fields.map((f) => (
                        <Badge key={f} className="bg-white text-amber-700 border-amber-200 text-xs font-bold px-3 py-1">
                          {f}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {ext?.line_items && ext.line_items.length > 0 && (
              <Card className="border-none shadow-xl shadow-gray-200/50 rounded-3xl overflow-hidden">
                <CardHeader className="bg-white border-b">
                  <CardTitle className="text-xl font-black text-gray-900 tracking-tight">Line Item Reconciliation</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50/50 border-b">
                        <th className="text-left px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Description</th>
                        <th className="text-right px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Qty</th>
                        <th className="text-right px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Unit Rate</th>
                        <th className="text-right px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {ext.line_items.map((li, i) => (
                        <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-6 py-4 font-medium text-gray-700">{li.description}</td>
                          <td className="px-6 py-4 text-right font-bold text-gray-900">{li.qty}</td>
                          <td className="px-6 py-4 text-right text-gray-500">₹{li.rate?.toLocaleString()}</td>
                          <td className="px-6 py-4 text-right font-black text-gray-900">₹{li.amount?.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="lg:col-span-4 space-y-8">
            <Card className="border-none shadow-xl shadow-gray-200/50 rounded-3xl overflow-hidden">
              <CardHeader className="bg-white border-b">
                <CardTitle className="text-base font-black text-gray-900 tracking-tight">Original Document</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="aspect-[3/4] bg-gray-100 rounded-2xl flex items-center justify-center border-2 border-dashed border-gray-200 mb-6 group relative overflow-hidden">
                  <div className="text-center z-10">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Source: {invoice.source}</p>
                    <a href={invoice.raw_file_url} target="_blank" rel="noreferrer">
                      <Button variant="outline" size="sm" className="bg-white shadow-lg border-none font-bold hover:scale-105 transition-all">
                        <ExternalLink className="h-4 w-4 mr-2" /> Open Full PDF
                      </Button>
                    </a>
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-gray-900/5 to-transparent pointer-events-none" />
                </div>
                <div className="space-y-4 pt-4 border-t">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500 font-medium">Processing Time</span>
                    <span className="text-xs font-bold text-gray-900">1.2s</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500 font-medium">Source Type</span>
                    <Badge variant="outline" className="text-[10px] font-bold uppercase">{invoice.source}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {invoice.invoice_matches && invoice.invoice_matches.length > 0 && (
              <Card className="border-none shadow-xl shadow-gray-200/50 rounded-3xl overflow-hidden bg-blue-600 text-white">
                <CardHeader className="border-b border-white/10">
                  <CardTitle className="text-base font-black tracking-tight">Smart Match Discovery</CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  {invoice.invoice_matches.map((m) => (
                    <div key={m.id} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <p className="text-[10px] font-black text-blue-200 uppercase tracking-widest">Matched PO</p>
                          <p className="font-bold">{m.purchase_orders?.po_number ?? "—"}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] font-black text-blue-200 uppercase tracking-widest">Linked GRN</p>
                          <p className="font-bold">{m.grns?.grn_number ?? "—"}</p>
                        </div>
                      </div>
                      <div className="pt-4 border-t border-white/10">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-xs font-medium text-blue-100">Match Confidence</span>
                          <span className="text-lg font-black">{m.match_score ? `${Math.round(m.match_score * 100)}%` : "—"}</span>
                        </div>
                        <Badge className="bg-white/20 text-white border-0 text-[10px] font-black uppercase w-full justify-center py-1.5">
                          {m.match_status.replace("_", " ")}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
