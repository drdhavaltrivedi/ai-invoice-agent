const getApiUrl = () => {
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

const API_URL = getApiUrl();
console.log(">>> INVOKING API FROM:", API_URL);

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  // Ensure we use the correct base URL
  const baseUrl = API_URL.endsWith("/") ? API_URL.slice(0, -1) : API_URL;
  // Ensure path doesn't have a trailing slash before query params to avoid Vercel redirects
  const cleanPath = path.replace(/\/(\?|$)/, "$1");
  
  const url = `${baseUrl}${cleanPath}`;
  
  const res = await fetch(url, {
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
      request<any>(`/api/invoices?${status ? `status=${status}&` : ""}page=${page}`),
    get: (id: string) => request<any>(`/api/invoices/${id}`),
    upload: (file: File) => {
      const form = new FormData();
      form.append("file", file);
      return fetch(`${API_URL}/api/invoices/upload`, { method: "POST", body: form }).then((r) => r.json());
    },
    stats: () => request<any>("/api/invoices/stats/summary"),
    delete: (id: string) => request<any>(`/api/invoices/${id}`, { method: "DELETE" }),
  },
  exceptions: {
    list: (status = "open", page = 1) =>
      request<any>(`/api/exceptions?status=${status}&page=${page}`),
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
      update: (id: string, data: any) =>
        request<any>(`/api/erp/purchase-orders/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
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
