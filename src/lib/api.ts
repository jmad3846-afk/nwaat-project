export type Role = "ADMIN" | "RECEPTION" | "DIAGNOSIS_DESK" | "TECHNICIAN_DESK";
export type User = {
  id: number;
  name: string;
  email: string;
  role: Role;
  desk_id: number | null;
  active: boolean;
};
export type Ticket = {
  id: number;
  reference: string;
  customer_name: string;
  customer_phone: string;
  brand: string;
  model: string;
  reported_issue: string;
  status: string;
  diagnosis?: string;
  notes?: string;
  estimated_cost: string;
  parts_cost: string;
  approved_at: string | null;
  unlocked_at: string | null;
  repair_started_at: string | null;
  delivery_due_at: string | null;
  timer_remaining_seconds: number | null;
  desk_id?: number | null;
  technician_id?: number | null;
  device_passcode?: string;
};
export type Desk = {
  id: number;
  name: string;
  active: boolean;
  active_technician?: Pick<User, "id" | "name" | "email"> | null;
};
export type Part = {
  id: number;
  name: string;
  sku: string;
  category: string;
  stock_quantity: number;
  minimum_warning_limit: number;
  unit_cost: string;
  sale_price: string;
};
export type Cashbox = {
  usd: number;
  syp: number;
  transactions: Array<{
    id: number;
    box: "USD" | "SYP";
    direction: "IN" | "OUT";
    category: string;
    amount: string;
    exchange_rate: string;
    description: string | null;
  }>;
};
export type ProfitReport = {
  sales_revenue: number;
  sales_cost: number;
  repair_revenue: number;
  repair_parts_cost: number;
  expenses_and_wages: number;
  gross_profit: number;
  net_profit: number;
};
export type AccountingInvoice = {
  id: number;
  type: "purchase" | "sale" | "purchase_return" | "sale_return" | "repair";
  invoice_number: string | null;
  counterparty_name: string | null;
  original_invoice_id: number | null;
  currency: "USD" | "SYP";
  exchange_rate: string;
  total: string;
  total_usd: string;
  created_at: string;
  lines: Array<{
    inventory_item_id: number;
    quantity: number;
    unit_price: string;
    line_total: string;
    item?: Pick<Part, "id" | "name" | "sku">;
  }>;
};
export type RewardProgress = {
  id: number;
  name: string;
  email?: string;
  desk_id: number | null;
  desk_name?: string | null;
  completed: number;
  target: number;
  progress: number;
  remaining: number;
  close: boolean;
};
const KEY = "nwaat-auth-token";
export const token = {
  get: () => (typeof window === "undefined" ? null : localStorage.getItem(KEY)),
  set: (v: string) => localStorage.setItem(KEY, v),
  clear: () => localStorage.removeItem(KEY),
};
export async function api<T>(
  path: string,
  method = "GET",
  body?: unknown,
  publicRequest = false,
): Promise<T> {
  const credential = token.get();
  let response: Response;
  try {
    response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api"}${path}`,
      {
        method,
        headers: {
          Accept: "application/json",
          ...(body ? { "Content-Type": "application/json" } : {}),
          ...(!publicRequest && credential
            ? { Authorization: `Bearer ${credential}` }
            : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
        cache: "no-store",
        signal: AbortSignal.timeout(15000),
      },
    );
  } catch (e) {
    if (e instanceof DOMException && e.name === "TimeoutError") {
      throw new Error(
        "انتهت مهلة الاتصال بالخادم. شغّل backend باستخدام start-api.ps1 ثم أعد المحاولة.",
      );
    }
    if (e instanceof TypeError) {
      throw new Error(
        "تعذر الاتصال بالخادم. تأكد من تشغيل MySQL وLaravel باستخدام start-api.ps1.",
      );
    }
    throw e;
  }
  if (response.status === 401 && !publicRequest) {
    token.clear();
    window.dispatchEvent(new Event("nwaat:unauthorized"));
  }
  if (!response.ok) {
    const p = await response
      .json()
      .catch(() => ({ message: "تعذر الاتصال بالخادم" }));
    throw new Error(
      p.errors
        ? Object.values(p.errors).flat().join(" · ")
        : p.message || `HTTP ${response.status}`,
    );
  }
  return response.status === 204 ? (undefined as T) : response.json();
}
export async function all<T>(path: string): Promise<T[]> {
  let page = 1,
    result: T[] = [];
  for (;;) {
    const data = await api<{ data: T[]; next_page_url: string | null }>(
      `${path}${path.includes("?") ? "&" : "?"}page=${page}`,
    );
    result = result.concat(data.data);
    if (!data.next_page_url) return result;
    page++;
  }
}
export const labels: Record<string, string> = {
  pending_diagnosis: "قيد التشخيص",
  awaiting_customer_approval: "بانتظار موافقة العميل",
  assigned_to_desk: "مسند إلى الطاولة",
  awaiting_parts: "بانتظار قطعة",
  in_repair: "قيد الإصلاح",
  ready_for_delivery: "جاهز للتسليم",
  delivered: "تم التسليم",
  cancelled: "ملغي",
};
export const money = (v: number | string) =>
  new Intl.NumberFormat("ar-SY", { style: "currency", currency: "USD" }).format(
    Number(v),
  );
