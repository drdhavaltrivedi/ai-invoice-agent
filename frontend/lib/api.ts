const getApiUrl = () => {
  // If we are on Vercel, always use the relative backend prefix
  if (typeof window !== "undefined" && window.location.hostname.includes("vercel.app")) {
    return "/_/backend";
  }
  
  const envUrl = process.env.NEXT_PUBLIC_API_URL;
  if (envUrl && envUrl.length > 1) return envUrl;
  
  return process.env.NODE_ENV === "production" ? "/_/backend" : "http://localhost:8000";
};

const API_URL = getApiUrl();
console.log(">>> INVOKING API FROM:", API_URL);

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Request failed");
  }
  return res.json();
}

export const api = {
  invoices: {
    list: (status?: string, page = 1) =>
      request<any>(`/api/invoices/?${status ? `status=${status}&` : ""}page=${page}`),
    get: (id: string) => request<any>(`/api/invoices/${id}`),
    upload: (file: File) => {
      const form = new FormData();
      form.append("file", file);
      return fetch(`${API_URL}/api/invoices/upload`, { method: "POST", body: form }).then((r) => r.json());
    },
    stats: () => request<any>("/api/invoices/stats/summary"),
  },
  exceptions: {
    list: (status = "open", page = 1) =>
      request<any>(`/api/exceptions/?status=${status}&page=${page}`),
    resolve: (id: string, body: { action: string; notes?: string; edited_data?: any }) =>
      request<any>(`/api/exceptions/${id}/resolve`, { method: "POST", body: JSON.stringify(body) }),
  },
  erp: {
    vendors: {
      list: () => request<any>("/api/erp/vendors"),
      create: (data: any) => request<any>("/api/erp/vendors", { method: "POST", body: JSON.stringify(data) }),
      update: (id: string, data: any) =>
        request<any>(`/api/erp/vendors/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    },
    purchaseOrders: {
      list: (status?: string) => request<any>(`/api/erp/purchase-orders${status ? `?status=${status}` : ""}`),
      create: (data: any) =>
        request<any>("/api/erp/purchase-orders", { method: "POST", body: JSON.stringify(data) }),
      get: (id: string) => request<any>(`/api/erp/purchase-orders/${id}`),
    },
    grns: {
      list: () => request<any>("/api/erp/grns"),
      create: (data: any) => request<any>("/api/erp/grns", { method: "POST", body: JSON.stringify(data) }),
    },
    ledger: () => request<any>("/api/erp/ledger"),
  },
  gmail: {
    status: () => request<any>("/api/gmail/status"),
    connect: () => request<any>("/api/gmail/connect"),
    poll: () => request<any>("/api/gmail/poll", { method: "POST" }),
  },
  notifications: {
    list: (userId: string, unreadOnly = false) =>
      request<any>(`/api/notifications/${userId}?unread_only=${unreadOnly}`),
    markRead: (id: string) => request<any>(`/api/notifications/${id}/read`, { method: "PATCH" }),
    markAllRead: (userId: string) =>
      request<any>(`/api/notifications/user/${userId}/read-all`, { method: "PATCH" }),
  },
};
