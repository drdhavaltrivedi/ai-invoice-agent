"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import Header from "@/components/layout/header";
import { Invoice } from "@/lib/types";
import StatusBadge from "@/components/invoices/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Eye, Mail, Upload, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";

export default function InvoicesPage() {
  const [status, setStatus] = useState<string>("all");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["invoices", status, page],
    queryFn: () => api.invoices.list(status === "all" ? undefined : status, page),
    refetchInterval: 15_000,
  });

  const invoices: Invoice[] = data?.data ?? [];
  const total: number = data?.total ?? 0;

  const qc = useQueryClient();
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.invoices.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
    },
  });

  return (
    <div className="flex flex-col flex-1">
      <Header title="Invoices" />
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <Select value={status} onValueChange={(v: string | null) => { setStatus(v ?? "all"); setPage(1); }}>
            <SelectTrigger className="w-44 bg-white">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="received">Received</SelectItem>
              <SelectItem value="processing">Processing</SelectItem>
              <SelectItem value="extracted">Extracted</SelectItem>
              <SelectItem value="matched">Matched</SelectItem>
              <SelectItem value="exception">Exception</SelectItem>
              <SelectItem value="posted">Posted</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-sm text-gray-500">{total} invoices</span>
        </div>

        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Invoice #</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Vendor</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">PO #</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Amount</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Source</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Received</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  [...Array(5)].map((_, i) => (
                    <tr key={i} className="border-b">
                      {[...Array(8)].map((_, j) => (
                        <td key={j} className="px-4 py-3">
                          <div className="h-4 bg-gray-100 rounded animate-pulse" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : invoices.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-gray-400">No invoices found</td>
                  </tr>
                ) : (
                  invoices.map((inv) => (
                    <tr key={inv.id} className="border-b hover:bg-gray-50 transition-colors group">
                      <td className="px-4 py-3 font-medium">{inv.invoice_number ?? "—"}</td>
                      <td className="px-4 py-3 text-gray-600">{inv.vendors?.name ?? inv.extracted_data?.vendor_name ?? "—"}</td>
                      <td className="px-4 py-3 text-gray-600">{inv.po_number ?? "—"}</td>
                      <td className="px-4 py-3 text-right font-medium">
                        {inv.total ? `₹${inv.total.toLocaleString()}` : "—"}
                      </td>
                      <td className="px-4 py-3">
                        {inv.source === "email" ? (
                          <span className="flex items-center gap-1 text-gray-500"><Mail className="h-3 w-3" /> Email</span>
                        ) : (
                          <span className="flex items-center gap-1 text-gray-500"><Upload className="h-3 w-3" /> Upload</span>
                        )}
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={inv.status} /></td>
                      <td className="px-4 py-3 text-gray-500">
                        {formatDistanceToNow(new Date(inv.created_at), { addSuffix: true })}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end opacity-0 group-hover:opacity-100 transition-opacity gap-1">
                          <Link href={`/invoices/${inv.id}`}>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0 text-gray-400 hover:text-red-600 hover:bg-red-50"
                            onClick={() => {
                              if (confirm("Are you sure you want to delete this invoice?")) {
                                deleteMutation.mutate(inv.id);
                              }
                            }}
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {total > 20 && (
          <div className="flex justify-center gap-2">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
            <span className="text-sm text-gray-500 flex items-center">Page {page} of {Math.ceil(total / 20)}</span>
            <Button variant="outline" size="sm" disabled={page >= Math.ceil(total / 20)} onClick={() => setPage(p => p + 1)}>Next</Button>
          </div>
        )}
      </div>
    </div>
  );
}
