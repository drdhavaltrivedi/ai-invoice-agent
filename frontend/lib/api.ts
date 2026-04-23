const getApiUrl = () => {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  
  if (typeof window !== "undefined") {
    if (window.location.hostname === "localhost") {
      return "http://localhost:8000";
    }
    // On Vercel, paths already start with /api, so we use an empty base
    return "";
  }
  
  // Fallback for SSR
  return "";
};

const isDemoMode = () => {
  if (typeof window !== "undefined") {
    const params = new URLSearchParams(window.location.search);
    if (params.get("demo") === "true") {
      document.cookie = "invoice_demo_mode=true; path=/; max-age=3600";
      localStorage.setItem("invoice_demo_mode", "true");
      return true;
    }
    const cookieMatch = document.cookie.match(/invoice_demo_mode=true/);
    return !!cookieMatch || localStorage.getItem("invoice_demo_mode") === "true";
  }
  return false;
};

const MOCK_DATA = {
  stats: {
    total: 42,
    by_status: {
      received: 5,
      processing: 2,
      extracted: 12,
      matched: 18,
      exception: 3,
      posted: 2,
      rejected: 0,
    },
    open_exceptions: 3,
  },
  invoices: [
    {
      id: "demo-1",
      invoice_number: "INV-9982",
      vendors: { name: "Global Logistics Corp" },
      po_number: "PO-2024-001",
      total: 12450.5,
      status: "matched",
      source: "email",
      created_at: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      id: "demo-2",
      invoice_number: "INV-9983",
      vendors: { name: "Cloud Services Inc" },
      po_number: "PO-2024-042",
      total: 890.0,
      status: "exception",
      source: "upload",
      created_at: new Date(Date.now() - 7200000).toISOString(),
    },
  ],
  pos: [
    { id: "po-1", po_number: "PO-2024-001", vendors: { name: "Global Logistics Corp" }, total_amount: 15000, status: "open" },
    { id: "po-2", po_number: "PO-2024-042", vendors: { name: "Cloud Services Inc" }, total_amount: 1000, status: "open" },
  ],
};

const API_URL = getApiUrl();
console.log(">>> INVOKING API FROM:", API_URL);

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  // Ensure we use the correct base URL
  const baseUrl = API_URL.endsWith("/") ? API_URL.slice(0, -1) : API_URL;
  // Ensure path doesn't have a trailing slash before query params to avoid Vercel redirects
  const cleanPath = path.replace(/\/(\?|$)/, "$1");
  
  const url = `${baseUrl}${cleanPath}`;
  
  const headers = new Headers(options?.headers);
  if (!(options?.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  
  const res = await fetch(url, {
    ...options,
    headers,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Request failed");
  }
  return res.json();
}

export const api = {
  isDemo: isDemoMode,
  invoices: {
    list: async (status?: string, page = 1) => {
      if (isDemoMode()) return { data: MOCK_DATA.invoices, total: 2, page: 1, limit: 20 };
      return request<any>(`/api/invoices?${status ? `status=${status}&` : ""}page=${page}`);
    },
    get: async (id: string) => {
      if (isDemoMode()) return MOCK_DATA.invoices.find(i => i.id === id) || MOCK_DATA.invoices[0];
      return request<any>(`/api/invoices/${id}`);
    },
    upload: async (file: File) => {
      if (isDemoMode()) {
        await new Promise(r => setTimeout(r, 2000));
        return { invoice_id: "demo-" + Math.random(), status: "processing" };
      }
      const form = new FormData();
      form.append("file", file);
      return request<any>("/api/invoices/upload", { method: "POST", body: form, headers: {} });
    },
    stats: async () => {
      if (isDemoMode()) return MOCK_DATA.stats;
      return request<any>("/api/invoices/stats/summary");
    },
    delete: (id: string) => request<any>(`/api/invoices/${id}`, { method: "DELETE" }),
    update: (id: string, body: { extracted_data?: any; status?: string; run_matching?: boolean; learn?: boolean }) =>
      request<any>(`/api/invoices/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  },
  exceptions: {
    list: async (status = "open", page = 1) => {
      if (isDemoMode()) return MOCK_DATA.invoices.filter(i => i.status === "exception");
      return request<any>(`/api/exceptions?status=${status}&page=${page}`);
    },
    resolve: (id: string, body: { action: string; notes?: string; edited_data?: any }) =>
      request<any>(`/api/exceptions/${id}/resolve`, { method: "POST", body: JSON.stringify(body) }),
  },
  erp: {
    vendors: {
      list: async () => {
        if (isDemoMode()) return [{ id: "v1", name: "Global Logistics Corp" }, { id: "v2", name: "Cloud Services Inc" }];
        return request<any>("/api/erp/vendors");
      },
      create: (data: any) => request<any>("/api/erp/vendors", { method: "POST", body: JSON.stringify(data) }),
      update: (id: string, data: any) =>
        request<any>(`/api/erp/vendors/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    },
    purchaseOrders: {
      list: async (status?: string) => {
        if (isDemoMode()) return MOCK_DATA.pos;
        return request<any>(`/api/erp/purchase-orders${status ? `?status=${status}` : ""}`);
      },
      create: (data: any) =>
        request<any>("/api/erp/purchase-orders", { method: "POST", body: JSON.stringify(data) }),
      update: (id: string, data: any) =>
        request<any>(`/api/erp/purchase-orders/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
      get: async (id: string) => {
        if (isDemoMode()) return MOCK_DATA.pos[0];
        return request<any>(`/api/erp/purchase-orders/${id}`);
      },
    },
    grns: {
      list: async () => {
        if (isDemoMode()) return [];
        return request<any>("/api/erp/grns");
      },
      create: (data: any) => request<any>("/api/erp/grns", { method: "POST", body: JSON.stringify(data) }),
    },
    ledger: async () => {
      if (isDemoMode()) return [];
      return request<any>("/api/erp/ledger");
    },
  },
  gmail: {
    status: async () => {
      if (isDemoMode()) return { connected: false };
      return request<any>("/api/gmail/status");
    },
    connect: () => request<any>("/api/gmail/connect"),
    poll: () => request<any>("/api/gmail/poll", { method: "POST" }),
    disconnect: () => request<any>("/api/gmail/disconnect", { method: "POST" }),
  },
  notifications: {
    list: (userId: string, unreadOnly = false) =>
      request<any>(`/api/notifications/${userId}?unread_only=${unreadOnly}`),
    markRead: (id: string) => request<any>(`/api/notifications/${id}/read`, { method: "PATCH" }),
    markAllRead: (userId: string) =>
      request<any>(`/api/notifications/user/${userId}/read-all`, { method: "PATCH" }),
  },
};
