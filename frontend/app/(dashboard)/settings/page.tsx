"use client";

import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import Header from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mail, CheckCircle, RefreshCw, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { useSearchParams } from "next/navigation";
import { useEffect, Suspense, useState } from "react";

function GmailIntegration() {
  const searchParams = useSearchParams();

  const { data: status, refetch } = useQuery({
    queryKey: ["gmail-status"],
    queryFn: api.gmail.status,
  });

  const poll = useMutation({
    mutationFn: api.gmail.poll,
    onSuccess: () => { toast.success("Gmail poll triggered — invoices will appear shortly"); refetch(); },
    onError: (e: any) => toast.error(e.message),
  });

  const disconnect = useMutation({
    mutationFn: api.gmail.disconnect,
    onSuccess: () => { toast.success("Gmail disconnected"); refetch(); },
    onError: (e: any) => toast.error(e.message),
  });

  useEffect(() => {
    if (searchParams.get("gmail") === "connected") {
      toast.success("Gmail connected successfully!");
      refetch();
    }
  }, [searchParams, refetch]);

  async function handleConnect() {
    if (api.isDemo()) {
      toast.info("Please sign up first to connect your real Gmail account!", {
        action: {
          label: "Sign Up",
          onClick: () => window.location.href = "/login"
        }
      });
      return;
    }
    const res = await api.gmail.connect();
    if (res.auth_url) window.location.href = res.auth_url;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Gmail Integration
        </CardTitle>
        <CardDescription>Connect Gmail to automatically fetch invoice emails</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600">Status:</span>
          {status?.connected ? (
            <Badge className="bg-green-100 text-green-700 border-0 gap-1">
              <CheckCircle className="h-3 w-3" /> Connected
            </Badge>
          ) : (
            <Badge className="bg-gray-100 text-gray-600 border-0">Not connected</Badge>
          )}
        </div>
        {api.isDemo() && (
          <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg text-sm text-blue-700">
            <strong>Demo Mode:</strong> You are viewing dummy data. Sign up to connect your own Gmail and process real invoices.
          </div>
        )}
        <div className="flex gap-2">
          {!status?.connected ? (
            <Button onClick={handleConnect} className="gap-1">
              <ExternalLink className="h-4 w-4" /> Connect Gmail
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => poll.mutate()} disabled={poll.isPending} className="gap-1">
                <RefreshCw className={`h-4 w-4 ${poll.isPending ? "animate-spin" : ""}`} />
                {poll.isPending ? "Polling..." : "Poll Now"}
              </Button>
              <Button variant="ghost" onClick={() => {
                if (confirm("Are you sure you want to disconnect Gmail?")) disconnect.mutate();
              }} disabled={disconnect.isPending} className="text-red-500 hover:text-red-600 hover:bg-red-50">
                Disconnect
              </Button>
            </div>
          )}
        </div>
        <p className="text-xs text-gray-400">
          When connected, Gmail is polled every 5 minutes for new invoice emails with PDF/image attachments.
        </p>
      </CardContent>
    </Card>
  );
}

export default function SettingsPage() {
  const [poPrefix, setPoPrefix] = useState("");
  const [grnPrefix, setGrnPrefix] = useState("");

  useEffect(() => {
    // Only access localStorage on the client
    setPoPrefix(localStorage.getItem("po_prefix") || "PO-" + new Date().getFullYear() + "-");
    setGrnPrefix(localStorage.getItem("grn_prefix") || "GRN-" + new Date().getFullYear() + "-");
  }, []);

  return (
    <div className="flex flex-col flex-1">
      <Header title="Settings" />
      <div className="p-6 max-w-2xl space-y-4">
        <Suspense fallback={<div className="h-40 bg-gray-100 rounded-lg animate-pulse" />}>
          <GmailIntegration />
        </Suspense>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              Numbering Series
            </CardTitle>
            <CardDescription>Configure auto-generation prefixes for POs and GRNs</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">PO Prefix</label>
                <input 
                  type="text" 
                  value={poPrefix}
                  onChange={(e) => {
                    setPoPrefix(e.target.value);
                    localStorage.setItem("po_prefix", e.target.value);
                  }}
                  className="w-full p-2 border rounded-md text-sm"
                  placeholder="e.g. PO-2024-"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">GRN Prefix</label>
                <input 
                  type="text" 
                  value={grnPrefix}
                  onChange={(e) => {
                    setGrnPrefix(e.target.value);
                    localStorage.setItem("grn_prefix", e.target.value);
                  }}
                  className="w-full p-2 border rounded-md text-sm"
                  placeholder="e.g. GRN-2024-"
                />
              </div>
            </div>
            <p className="text-xs text-gray-400">
              Prefixes are used to auto-suggest the next document number. You can still edit them manually during creation.
            </p>
            <Button onClick={() => toast.success("Settings saved locally")} variant="outline" size="sm">
              Save Configuration
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
