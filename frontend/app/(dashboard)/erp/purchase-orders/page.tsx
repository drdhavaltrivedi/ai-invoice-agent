"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import Header from "@/components/layout/header";
import { PurchaseOrder, Vendor } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface LineItem { description: string; qty: string; rate: string; amount: string }

export default function PurchaseOrdersPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [vendorId, setVendorId] = useState("");
  const [poNumber, setPoNumber] = useState("");
  const [poDate, setPoDate] = useState("");
  const [lineItems, setLineItems] = useState<LineItem[]>([{ description: "", qty: "", rate: "", amount: "" }]);

  const { data: pos = [], isLoading } = useQuery<PurchaseOrder[]>({ queryKey: ["pos"], queryFn: () => api.erp.purchaseOrders.list() });
  const { data: vendors = [] } = useQuery<Vendor[]>({ queryKey: ["vendors"], queryFn: () => api.erp.vendors.list() });

  const create = useMutation({
    mutationFn: () => api.erp.purchaseOrders.create({
      vendor_id: vendorId,
      po_number: poNumber,
      po_date: poDate,
      line_items: lineItems.map(li => ({ description: li.description, qty: +li.qty, rate: +li.rate, amount: +li.qty * +li.rate })),
      total_amount: lineItems.reduce((s, li) => s + +li.qty * +li.rate, 0),
    }),
    onSuccess: () => {
      toast.success("Purchase order created");
      qc.invalidateQueries({ queryKey: ["pos"] });
      setOpen(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  function updateLI(i: number, field: keyof LineItem, val: string) {
    setLineItems(prev => prev.map((li, idx) => idx === i ? { ...li, [field]: val, amount: field === "qty" || field === "rate" ? String(+(field === "qty" ? val : li.qty) * +(field === "rate" ? val : li.rate)) : li.amount } : li));
  }

  const statusColor: Record<string, string> = { open: "bg-blue-100 text-blue-700", received: "bg-green-100 text-green-700", closed: "bg-gray-100 text-gray-700", cancelled: "bg-red-100 text-red-700" };

  return (
    <div className="flex flex-col flex-1">
      <Header title="Purchase Orders" />
      <div className="p-6 space-y-4">
        <div className="flex justify-end">
          <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1" /> New PO</Button>
        </div>

        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-gray-50">
                <th className="text-left px-4 py-3 font-medium text-gray-600">PO Number</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Vendor</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Amount</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
              </tr></thead>
              <tbody>
                {isLoading ? (
                  [...Array(3)].map((_, i) => <tr key={i} className="border-b"><td colSpan={5} className="px-4 py-3"><div className="h-4 bg-gray-100 animate-pulse rounded" /></td></tr>)
                ) : pos.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">No purchase orders yet</td></tr>
                ) : pos.map((po) => (
                  <tr key={po.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{po.po_number}</td>
                    <td className="px-4 py-3 text-gray-600">{po.vendors?.name ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-600">{po.po_date ? format(new Date(po.po_date), "dd MMM yyyy") : "—"}</td>
                    <td className="px-4 py-3 text-right font-medium">₹{po.total_amount?.toLocaleString()}</td>
                    <td className="px-4 py-3"><Badge className={`${statusColor[po.status]} border-0`}>{po.status}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-4xl w-[95vw] max-h-[95vh] overflow-y-auto p-0 gap-0 border-none shadow-2xl">
          <div className="p-6 border-b bg-white sticky top-0 z-20">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-gray-900">Create New Purchase Order</DialogTitle>
              <p className="text-sm text-gray-500">Master record for procurement tracking and automated matching.</p>
            </DialogHeader>
          </div>
          
          <div className="p-8 space-y-8 bg-gray-50/50">
            {/* Header Fields */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="space-y-2.5">
                <Label className="text-sm font-bold text-gray-700 uppercase tracking-tight">Vendor Details *</Label>
                <Select value={vendorId} onValueChange={(v: string | null) => {
                  setVendorId(v ?? "");
                  // Auto-generate PO number if empty
                  if (!poNumber) {
                    const prefix = localStorage.getItem("po_prefix") || "PO-" + new Date().getFullYear() + "-";
                    const count = (pos.length + 1).toString().padStart(3, "0");
                    setPoNumber(prefix + count);
                  }
                }}>
                  <SelectTrigger className="bg-white border-gray-200 h-11 focus:ring-2 focus:ring-blue-500 transition-all">
                    <SelectValue placeholder="Select vendor">
                      {vendors.find(v => v.id === vendorId)?.name}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {vendors.map(v => (
                      <SelectItem key={v.id} value={v.id} className="py-2.5 cursor-pointer">
                        {v.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2.5">
                <Label className="text-sm font-bold text-gray-700 uppercase tracking-tight">PO Reference *</Label>
                <Input 
                  value={poNumber} 
                  onChange={e => setPoNumber(e.target.value)} 
                  placeholder="e.g. PO-2024-8832" 
                  className="bg-white border-gray-200 h-11 focus:ring-2 focus:ring-blue-500 font-mono" 
                />
              </div>
              <div className="space-y-2.5">
                <Label className="text-sm font-bold text-gray-700 uppercase tracking-tight">Issuance Date</Label>
                <Input 
                  type="date" 
                  value={poDate} 
                  onChange={e => setPoDate(e.target.value)} 
                  className="bg-white border-gray-200 h-11 focus:ring-2 focus:ring-blue-500" 
                />
              </div>
            </div>

            {/* Line Items Section */}
            <div className="space-y-4">
              <div className="flex justify-between items-end">
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-gray-900">Line Items</h3>
                  <p className="text-xs text-gray-500">Individual goods or services being procured.</p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setLineItems(p => [...p, { description: "", qty: "", rate: "", amount: "" }])} 
                  className="border-blue-200 text-blue-600 hover:bg-blue-600 hover:text-white transition-all font-semibold px-4"
                >
                  <Plus className="h-4 w-4 mr-1.5" /> Add New Row
                </Button>
              </div>
              
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <div className="min-w-[800px] p-4">
                    <div className="grid grid-cols-12 gap-4 mb-4 px-2 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b pb-2">
                      <div className="col-span-6">Description / Item Details</div>
                      <div className="col-span-2 text-center">Quantity</div>
                      <div className="col-span-2 text-center">Unit Price (₹)</div>
                      <div className="col-span-2 text-right pr-10">Total Amount</div>
                    </div>
                    
                    <div className="space-y-3">
                      {lineItems.map((li, i) => (
                        <div key={i} className="grid grid-cols-12 gap-4 items-center group bg-gray-50/50 hover:bg-blue-50/30 p-2 rounded-xl transition-colors">
                          <div className="col-span-6">
                            <Input 
                              className="border-none shadow-none focus-visible:ring-0 bg-transparent placeholder:text-gray-300 font-medium h-9" 
                              placeholder="What are you purchasing?" 
                              value={li.description} 
                              onChange={e => updateLI(i, "description", e.target.value)} 
                            />
                          </div>
                          <div className="col-span-2">
                            <Input 
                              className="border-none shadow-none focus-visible:ring-0 bg-transparent text-center font-semibold h-9" 
                              type="number" 
                              value={li.qty} 
                              onChange={e => updateLI(i, "qty", e.target.value)} 
                            />
                          </div>
                          <div className="col-span-2">
                            <Input 
                              className="border-none shadow-none focus-visible:ring-0 bg-transparent text-center font-semibold h-9" 
                              type="number" 
                              value={li.rate} 
                              onChange={e => updateLI(i, "rate", e.target.value)} 
                            />
                          </div>
                          <div className="col-span-2 flex items-center justify-end gap-3">
                            <span className="font-bold text-gray-700 text-sm">
                              ₹{(+li.qty * +li.rate || 0).toLocaleString()}
                            </span>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-gray-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all" 
                              onClick={() => setLineItems(p => p.filter((_, j) => j !== i))} 
                              disabled={lineItems.length === 1}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                
                <div className="bg-gray-50 p-6 flex justify-between items-center border-t border-gray-200">
                  <div className="text-xs text-gray-400 font-medium max-w-[200px]">
                    Total amount is calculated automatically based on quantities and unit rates.
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Grand Total Payable</div>
                    <div className="text-4xl font-black text-blue-600 tracking-tighter">
                      ₹{lineItems.reduce((s, li) => s + +li.qty * +li.rate || 0, 0).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 bg-white border-t flex justify-end gap-4 sticky bottom-0 z-20">
            <Button variant="ghost" onClick={() => setOpen(false)} className="px-8 font-semibold text-gray-500 hover:text-gray-900">
              Discard Draft
            </Button>
            <Button 
              className="px-10 bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-xl shadow-blue-200 h-12 rounded-xl transition-all active:scale-95"
              disabled={!vendorId || !poNumber || create.isPending} 
              onClick={() => create.mutate()}
            >
              {create.isPending ? "Syncing to Ledger..." : "Confirm & Create PO"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
