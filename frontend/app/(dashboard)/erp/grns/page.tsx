"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import Header from "@/components/layout/header";
import { GRN, PurchaseOrder } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export default function GRNsPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [poId, setPoId] = useState("");
  const [grnNumber, setGrnNumber] = useState("");
  const [receivedDate, setReceivedDate] = useState("");
  const [notes, setNotes] = useState("");

  const { data: grns = [], isLoading } = useQuery<GRN[]>({ queryKey: ["grns"], queryFn: () => api.erp.grns.list() });
  const { data: pos = [] } = useQuery<PurchaseOrder[]>({ queryKey: ["pos"], queryFn: () => api.erp.purchaseOrders.list() });

  const create = useMutation({
    mutationFn: () => api.erp.grns.create({ po_id: poId, grn_number: grnNumber, received_date: receivedDate, items_received: [], notes }),
    onSuccess: () => {
      toast.success("GRN created");
      qc.invalidateQueries({ queryKey: ["grns"] });
      setOpen(false);
      setPoId(""); setGrnNumber(""); setReceivedDate(""); setNotes("");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="flex flex-col flex-1">
      <Header title="Goods Receipt Notes" />
      <div className="p-6 space-y-4">
        <div className="flex justify-end">
          <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1" /> New GRN</Button>
        </div>

        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-gray-50">
                <th className="text-left px-4 py-3 font-medium text-gray-600">GRN Number</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">PO Number</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Vendor</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Received Date</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
              </tr></thead>
              <tbody>
                {isLoading ? (
                  [...Array(3)].map((_, i) => <tr key={i} className="border-b"><td colSpan={5} className="px-4 py-3"><div className="h-4 bg-gray-100 animate-pulse rounded" /></td></tr>)
                ) : grns.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">No GRNs yet</td></tr>
                ) : grns.map((g) => (
                  <tr key={g.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{g.grn_number}</td>
                    <td className="px-4 py-3 text-gray-600">{g.purchase_orders?.po_number ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-600">{g.purchase_orders?.vendors?.name ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-600">{g.received_date ? format(new Date(g.received_date), "dd MMM yyyy") : "—"}</td>
                    <td className="px-4 py-3 capitalize text-gray-600">{g.status}</td>
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
              <DialogTitle className="text-2xl font-bold text-gray-900">Create New GRN</DialogTitle>
              <p className="text-sm text-gray-500">Record receipt of goods against a confirmed Purchase Order.</p>
            </DialogHeader>
          </div>
          
          <div className="p-8 space-y-8 bg-gray-50/50">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2.5">
                <Label className="text-sm font-bold text-gray-700 uppercase tracking-tight">Purchase Order *</Label>
                <Select value={poId} onValueChange={(v: string | null) => {
                  setPoId(v ?? "");
                  if (!grnNumber) {
                    const prefix = localStorage.getItem("grn_prefix") || "GRN-" + new Date().getFullYear() + "-";
                    const count = (grns.length + 1).toString().padStart(3, "0");
                    setGrnNumber(prefix + count);
                  }
                }}>
                  <SelectTrigger className="bg-white border-gray-200 h-11 focus:ring-2 focus:ring-blue-500 transition-all">
                    <SelectValue placeholder="Select PO">
                      {pos.find(p => p.id === poId)?.po_number}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {pos.filter(p => p.status === "open").map(p => (
                      <SelectItem key={p.id} value={p.id} className="py-2.5">
                        <div className="flex flex-col">
                          <span className="font-medium">{p.po_number}</span>
                          <span className="text-xs text-gray-400">{p.vendors?.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2.5">
                <Label className="text-sm font-bold text-gray-700 uppercase tracking-tight">GRN Number *</Label>
                <Input 
                  value={grnNumber} 
                  onChange={e => setGrnNumber(e.target.value)} 
                  placeholder="e.g. GRN-2024-001" 
                  className="bg-white border-gray-200 h-11 focus:ring-2 focus:ring-blue-500 font-mono" 
                />
              </div>
              <div className="space-y-2.5">
                <Label className="text-sm font-bold text-gray-700 uppercase tracking-tight">Received Date</Label>
                <Input 
                  type="date" 
                  value={receivedDate} 
                  onChange={e => setReceivedDate(e.target.value)} 
                  className="bg-white border-gray-200 h-11 focus:ring-2 focus:ring-blue-500" 
                />
              </div>
              <div className="space-y-2.5">
                <Label className="text-sm font-bold text-gray-700 uppercase tracking-tight">Notes / Remarks</Label>
                <Input 
                  value={notes} 
                  onChange={e => setNotes(e.target.value)} 
                  placeholder="Any delivery discrepancies..." 
                  className="bg-white border-gray-200 h-11 focus:ring-2 focus:ring-blue-500" 
                />
              </div>
            </div>
          </div>

          <div className="p-6 bg-white border-t flex justify-end gap-4 sticky bottom-0 z-20">
            <Button variant="ghost" onClick={() => setOpen(false)} className="px-8 font-semibold text-gray-500 hover:text-gray-900">
              Cancel
            </Button>
            <Button 
              className="px-10 bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-xl shadow-blue-200 h-12 rounded-xl transition-all active:scale-95"
              disabled={!poId || !grnNumber || create.isPending} 
              onClick={() => create.mutate()}
            >
              {create.isPending ? "Creating..." : "Confirm & Create GRN"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
