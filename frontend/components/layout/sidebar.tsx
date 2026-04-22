"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  AlertTriangle,
  Users,
  ShoppingCart,
  Package,
  BookOpen,
  Settings,
  LogOut,
  FileText as InvoiceIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/invoices", label: "Invoices", icon: FileText },
  { href: "/exceptions", label: "Exceptions", icon: AlertTriangle },
  { type: "divider", label: "ERP" },
  { href: "/erp/vendors", label: "Vendors", icon: Users },
  { href: "/erp/purchase-orders", label: "Purchase Orders", icon: ShoppingCart },
  { href: "/erp/grns", label: "GRNs", icon: Package },
  { href: "/erp/ledger", label: "AP Ledger", icon: BookOpen },
  { type: "divider", label: "Support" },
  { href: "/docs", label: "Documentation", icon: FileText },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <aside className="w-60 bg-gray-900 text-white flex flex-col h-full fixed left-0 top-0 bottom-0">
      <div className="p-4 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-blue-600 rounded-lg">
            <InvoiceIcon className="h-5 w-5 text-white" />
          </div>
          <span className="font-semibold text-sm">Invoice Agent</span>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {navItems.map((item, i) => {
          if (item.type === "divider") {
            return (
              <div key={i} className="pt-4 pb-1 px-2">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">{item.label}</span>
              </div>
            );
          }
          const Icon = item.icon!;
          const active = pathname === item.href || pathname.startsWith(item.href! + "/");
          return (
            <Link
              key={item.href}
              href={item.href!}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors",
                active ? "bg-blue-600 text-white" : "text-gray-400 hover:bg-gray-800 hover:text-white"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-gray-800">
        <button
          onClick={handleLogout}
          className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-gray-400 hover:bg-gray-800 hover:text-white transition-colors w-full"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
