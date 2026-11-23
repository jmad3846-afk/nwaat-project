"use client";
import { FormEvent, useCallback, useEffect, useState } from "react";
import type { InputHTMLAttributes } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowLeftRight,
  Boxes,
  Calendar,
  CheckCircle2,
  ClipboardList,
  Clock,
  Cpu,
  Inbox,
  LayoutDashboard,
  LogOut,
  MessageCircle,
  Moon,
  Package,
  PackageCheck,
  PackagePlus,
  Plus,
  FileText,
  Printer,
  RefreshCw,
  Save,
  Search,
  Settings,
  ShieldCheck,
  Smartphone,
  Stethoscope,
  Sun,
  Trash2,
  TrendingUp,
  Trophy,
  Upload,
  User,
  Users,
  Volume2,
  VolumeX,
  Wrench,
  Wallet,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import {
  api,
  all,
  token,
  User as TUser,
  Ticket,
  Part,
  Desk,
  labels,
  money,
  RewardProgress,
  Cashbox,
  ProfitReport,
  AccountingInvoice,
} from "../lib/api";
import { sfx } from "../lib/sfx";

type Receipt = {
  ticket: Ticket;
  part_a: { tracking_url: string; security_code?: string | null };
  part_b: { security_code: string };
  logo?: string | null;
  workshop_name?: string;
};

type MenuItem = { key: string; label: string; icon: LucideIcon };

export default function Home() {
  const [user, setUser] = useState<TUser | null>(null),
    [loading, setLoading] = useState(true),
    [tab, setTab] = useState("tickets"),
    [tickets, setTickets] = useState<Ticket[]>([]),
    [parts, setParts] = useState<Part[]>([]),
    [desks, setDesks] = useState<Desk[]>([]),
    [staff, setStaff] = useState<TUser[]>([]),
    [former, setFormer] = useState<TUser[]>([]),
    [selected, setSelected] = useState<Ticket | null>(null),
    [receipt, setReceipt] = useState<Receipt | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [search, setSearch] = useState(""),
    [count, setCount] = useState(0),
    [theme, setTheme] = useState<"dark" | "light">("dark"),
    [sound, setSound] = useState(true),
    [rewards, setRewards] = useState<RewardProgress[]>([]),
    [cashbox, setCashbox] = useState<Cashbox | null>(null),
    [profits, setProfits] = useState<ProfitReport | null>(null),
    [invoices, setInvoices] = useState<AccountingInvoice[]>([]);
  const [technicians, setTechnicians] = useState<
    { id: number; name: string; desk_id: number }[]
  >([]);
  const [settings, setSettings] = useState<{
    name: string;
    phone: string | null;
    address: string | null;
    logo: string | null;
    inventory_locked_at?: string | null;
  } | null>(null);

  const refresh = useCallback(async (u: TUser) => {
    const sessionToken = token.get();
    const [ts, ps, ds] = await Promise.all([
      all<Ticket>("/tickets"),
      all<Part>("/inventory"),
      all<Desk>("/desks"),
    ]);
    if (!sessionToken || token.get() !== sessionToken) return;
    setTickets(ts);
    setParts(ps);
    setDesks(ds);
    if (u.role === "ADMIN") {
      const [a, b] = await Promise.all([
        all<TUser>("/staff?type=current"),
        all<TUser>("/staff?type=former"),
      ]);
      setStaff(a);
      setFormer(b);
      setSettings(await api("/settings"));
    }
    if (u.role === "ADMIN" || u.role === "TECHNICIAN_DESK") {
      const reward = await api<
        { data: RewardProgress[] } | RewardProgress
      >("/rewards");
      setRewards(
        "data" in reward
          ? reward.data
          : reward
            ? [reward]
            : [],
      );
    }
    if (u.role !== "TECHNICIAN_DESK") {
      const q = await api<{ count: number }>("/tickets/diagnosis-queue");
      setCount(q.count);
      if (u.role === "ADMIN" || u.role === "RECEPTION")
        setTechnicians(await api("/technicians"));
    }
    if (u.role === "ADMIN" || u.role === "RECEPTION") {
      setCashbox(await api<Cashbox>("/accounting/cashbox"));
      setInvoices(await all<AccountingInvoice>("/accounting/invoices"));
    }
    if (u.role === "ADMIN") {
      setProfits(await api<ProfitReport>("/accounting/profits"));
    }
  }, []);

  useEffect(() => {
    const reset = () => {
      setUser(null);
      setSelected(null);
      setReceipt(null);
      setTickets([]);
      setParts([]);
      setStaff([]);
      setFormer([]);
    };
    window.addEventListener("nwaat:unauthorized", reset);
    if (token.get())
      api<TUser>("/auth/me")
        .then((u) => {
          setUser(u);
          void refresh(u).catch((e) =>
            setError(e instanceof Error ? e.message : "تعذر تحميل البيانات"),
          );
        })
        .catch((e) => {
          token.clear();
          setError(e instanceof Error ? e.message : "تعذر التحقق من الجلسة");
        })
        .finally(() => setLoading(false));
    else setLoading(false);
    return () => window.removeEventListener("nwaat:unauthorized", reset);
  }, [refresh]);

  useEffect(() => {
    if (!user) return;
    const i = setInterval(
      () => refresh(user).catch((e) => setError(e.message)),
      15000,
    );
    return () => clearInterval(i);
  }, [user, refresh]);

  useEffect(() => {
    setTheme(
      document.documentElement.dataset.theme === "light" ? "light" : "dark",
    );
    setSound(sfx.isEnabled());
  }, []);

  // نغمة نقر واحدة على كل أزرار البرنامج. نلتقط في مرحلة capture حتى تعمل
  // قبل معالجات React، ونتخطى العناصر المعلّمة بـ data-sfx="none".
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const control = target?.closest?.<HTMLElement>(
        "button, a, [role='button']",
      );
      if (!control) return;
      if (control.getAttribute("data-sfx") === "none") return;
      if (control.hasAttribute("disabled")) return;
      sfx.tap();
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("nwaat-theme", next);
    } catch {
      /* storage unavailable */
    }
  };

  const toggleSound = () => setSound(sfx.toggle());

  const run = async (fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await fn();
      if (user && token.get()) await refresh(user);
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذر تنفيذ العملية");
      sfx.play("error");
    } finally {
      setBusy(false);
    }
  };

  const form =
    (fn: (v: Record<string, FormDataEntryValue>) => Promise<void>) =>
    (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const v = Object.fromEntries(new FormData(e.currentTarget));
      void run(() => fn(v));
    };

  const update = async (v: unknown) => {
    if (!selected) return;
    await api(`/tickets/${selected.id}/status`, "PUT", v);
    setSelected(await api<Ticket>(`/tickets/${selected.id}`));
  };

  const openReceipt = async (id: number) => {
    setReceipt(await api<Receipt>(`/tickets/${id}/receipt`));
  };

  const saveInvoice = async (type: string, payload: unknown) => {
    await api(`/accounting/invoices/${type}`, "POST", payload);
    if (user) await refresh(user);
  };

  if (loading)
    return (
      <main className="loading-screen" dir="rtl">
        <div className="inner">
          <span className="spinner" />
          <p>جاري التحقق من الجلسة…</p>
        </div>
      </main>
    );

  if (!user)
    return (
      <main className="auth-screen" dir="rtl">
        <section className="auth-card">
          <div className="auth-head">
            <div className="brand-mark brand-mark-lg">
              <Cpu size={28} />
            </div>
            <div className="toggle-group">
              <button
                type="button"
                className="theme-toggle"
                onClick={toggleSound}
                data-sfx="none"
                aria-label={sound ? "كتم الصوت" : "تشغيل الصوت"}
                aria-pressed={sound}
              >
                {sound ? <Volume2 size={17} /> : <VolumeX size={17} />}
              </button>
              <button
                type="button"
                className="theme-toggle"
                onClick={toggleTheme}
                aria-label="تبديل المظهر"
              >
                {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
              </button>
            </div>
          </div>
          <h1 className="auth-title">
            نواة <span className="text-gold">للصيانة</span>
          </h1>
          <p className="auth-sub">تسجيل الدخول إلى مساحة العمل</p>
          <form
            className="auth-form"
            style={{ marginTop: 24 }}
            onSubmit={form(async (v) => {
              const r = await api<{ token: string; user: TUser }>(
                "/auth/login",
                "POST",
                v,
                true,
              );
              token.set(r.token);
              setTab("tickets");
              setUser(r.user);
              await refresh(r.user);
            })}
          >
            <Field
              label="البريد الإلكتروني"
              name="email"
              type="email"
              autoComplete="email"
              required
            />
            <Field
              label="كلمة المرور"
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
            {error && (
              <div role="alert" className="alert alert-error">
                <AlertTriangle size={17} />
                {error}
              </div>
            )}
            <button disabled={busy} className="btn btn-gold btn-block">
              {busy ? <span className="spinner" /> : null}
              {busy ? "جاري الدخول…" : "تسجيل الدخول"}
            </button>
            <p className="auth-foot">
              <ShieldCheck size={15} />
              صلاحيات مرتبطة بالدور وطاولة العمل
            </p>
          </form>
        </section>
      </main>
    );

  const admin = user.role === "ADMIN",
    reception = admin || user.role === "RECEPTION",
    diagnosis = admin || user.role === "DIAGNOSIS_DESK",
    tech = user.role === "TECHNICIAN_DESK";
  const themeClass =
    user.role === "TECHNICIAN_DESK"
      ? `theme-desk-${(((user.desk_id ?? 1) - 1) % 6) + 1}`
      : `theme-${user.role.toLowerCase().replaceAll("_", "-")}`;

  const menu: MenuItem[] = [
    {
      key: "tickets",
      label: tech ? "طاولة العمل" : "لوحة الطلبات",
      icon: tech ? Wrench : LayoutDashboard,
    },
    ...(reception
      ? [
          { key: "intake", label: "استلام جهاز", icon: PackagePlus },
          { key: "delivery", label: "جاهز للتسليم", icon: PackageCheck },
        ]
      : []),
    ...(diagnosis
      ? [{ key: "diagnosis", label: "مكتب التشخيص", icon: Stethoscope }]
      : []),
    { key: "inventory", label: "قطع الغيار", icon: Boxes },
    ...(reception
      ? [
          { key: "invoices", label: "الفواتير", icon: FileText },
          { key: "cashbox", label: "الصندوق والتحويل", icon: Wallet },
        ]
      : []),
    ...(admin
      ? [
          { key: "staff", label: "الفريق والطاولات", icon: Users },
          { key: "settings", label: "إعدادات النظام", icon: Settings },
          { key: "rewards", label: "المكافآت والجوائز", icon: Trophy },
          { key: "profits", label: "الأرباح", icon: TrendingUp },
        ]
      : tech
        ? [{ key: "rewards", label: "تقدمي والمكافآت", icon: Trophy }]
        : []),
  ];

  const shown = tickets.filter(
    (t) =>
      (tab !== "diagnosis" ||
        ["pending_diagnosis", "awaiting_customer_approval"].includes(
          t.status,
        )) &&
      (tab !== "delivery" || t.status === "ready_for_delivery") &&
      `${t.reference} ${t.customer_name} ${t.customer_phone} ${t.brand} ${t.model}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );

  const pageTitle = menu.find((x) => x.key === tab)?.label ?? "لوحة الطلبات";
  const dateLine = new Intl.DateTimeFormat("ar-SY", {
    dateStyle: "full",
    timeZone: "Asia/Damascus",
  }).format(new Date());

  const activeCount = tickets.filter(
    (t) => !["delivered", "cancelled"].includes(t.status),
  ).length;
  const repairCount = tickets.filter((t) => t.status === "in_repair").length;
  const readyCount = tickets.filter(
    (t) => t.status === "ready_for_delivery",
  ).length;
  const lowStock = parts.filter(
    (p) => p.stock_quantity <= p.minimum_warning_limit,
  ).length;
  const assignedCount = tickets.filter(
    (t) =>
      t.desk_id &&
      ["assigned_to_desk", "awaiting_parts", "in_repair"].includes(t.status),
  ).length;
  const technicianOverload = assignedCount > 20;
  const soonCount = tickets.filter((t) => {
    if (t.status !== "in_repair" || !t.delivery_due_at) return false;
    const remaining = Date.parse(t.delivery_due_at) - Date.now();
    return remaining > 0 && remaining <= 10 * 60 * 1000;
  }).length;

  const logout = () =>
    void run(async () => {
      await api("/auth/logout", "POST");
      token.clear();
      setUser(null);
      setSelected(null);
      setReceipt(null);
      setTickets([]);
      setParts([]);
      setStaff([]);
      setFormer([]);
    });

  return (
    <div className={`app-shell ${themeClass}`} dir="rtl">
      <aside className="app-sidebar">
        <div className="sidebar-brand">
          <div className="brand-mark">
            <Cpu size={22} />
          </div>
          <div>
            <strong>
              نواة <span className="text-gold">للتقنية</span>
            </strong>
            <p>WORKSHOP OS</p>
          </div>
        </div>

        <p className="nav-group-label">مساحة العمل</p>
        <nav className="sidebar-nav" aria-label="التنقل الرئيسي">
          {menu.map((item) => (
            <button
              key={item.key}
              onClick={() => {
                setTab(item.key);
                setSelected(null);
                setSearch("");
              }}
              className={`nav-link ${tab === item.key ? "active" : ""}`}
              aria-current={tab === item.key ? "page" : undefined}
            >
              <item.icon size={18} />
              <span>{item.label}</span>
              {item.key === "diagnosis" && count > 0 && (
                <span className="nav-badge num">{count}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="sidebar-foot">
          <div className="user-chip">
            <div className="user-avatar">{user.name.trim().charAt(0)}</div>
            <div className="meta">
              <strong>{user.name}</strong>
              <span>
                {user.role}
                {user.desk_id ? ` · DESK ${user.desk_id}` : ""}
              </span>
            </div>
          </div>
          <div className="row-actions">
            <button
              className="btn btn-ghost btn-sm"
              style={{ flex: 1 }}
              onClick={logout}
              disabled={busy}
            >
              <LogOut size={15} />
              تسجيل الخروج
            </button>
            <div className="toggle-group">
              <button
                type="button"
                className="theme-toggle"
                onClick={toggleSound}
                data-sfx="none"
                aria-label={sound ? "كتم الصوت" : "تشغيل الصوت"}
                aria-pressed={sound}
              >
                {sound ? <Volume2 size={17} /> : <VolumeX size={17} />}
              </button>
              <button
                type="button"
                className="theme-toggle"
                onClick={toggleTheme}
                aria-label="تبديل المظهر"
              >
                {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
              </button>
            </div>
          </div>
        </div>
      </aside>

      <main className="workspace">
        <header className="topbar">
          <div>
            <p className="date">
              <Calendar size={14} />
              {dateLine}
            </p>
            <h1>{pageTitle}</h1>
          </div>
          <div className="topbar-actions">
            <span className="chip chip-accent">
              <User size={13} />
              {user.role}
            </span>
            <button
              disabled={busy}
              className="btn btn-muted btn-sm"
              onClick={() => void run(async () => {})}
            >
              <RefreshCw size={15} />
              تحديث
            </button>
          </div>
        </header>

        {error && (
          <div role="alert" className="alert alert-error" style={{ marginBottom: 20 }}>
            <AlertTriangle size={17} />
            {error}
          </div>
        )}
        {count > 10 && (
          <div
            className="alert alert-warning"
            style={{ marginBottom: 20 }}
          >
            <AlertTriangle size={17} />
            تحذير ضغط التشخيص: {count} جهازاً بانتظار التشخيص
          </div>
        )}
        {technicianOverload && (
          <div className="alert alert-warning" style={{ marginBottom: 20 }}>
            <AlertTriangle size={17} />
            تحذير ضغط طاولات الفنيين: {assignedCount} جهازاً مسنداً حالياً،
            والحد الموصى به 20 جهازاً.
          </div>
        )}
        {tech && soonCount > 0 && (
          <div className="alert alert-warning" style={{ marginBottom: 20 }}>
            <Clock size={17} />
            تنبيه: يوجد {soonCount} جهاز يقترب موعد إصلاحه من الانتهاء.
          </div>
        )}

        <div className="stats-grid">
          <StatCard
            icon={Smartphone}
            label="الأجهزة النشطة"
            value={activeCount}
            hint="قيد المعالجة حالياً"
            accent
          />
          <StatCard
            icon={Wrench}
            label="قيد الإصلاح"
            value={repairCount}
            hint="على طاولات الفنيين"
          />
          <StatCard
            icon={PackageCheck}
            label="جاهز للتسليم"
            value={readyCount}
            hint="بانتظار استلام العملاء"
          />
          <StatCard
            icon={Package}
            label="مخزون منخفض"
            value={lowStock}
            hint="تحت حد التنبيه"
          />
        </div>

        {["tickets", "diagnosis", "delivery"].includes(tab) && (
          <>
            <div className="toolbar">
              <div className="search-box">
                <Search size={17} />
                <input
                  aria-label="بحث الطلبات"
                  className="input"
                  placeholder="بحث باسم العميل أو الهاتف أو رقم الطلب…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <span className="chip num">{shown.length} طلب</span>
            </div>

            {shown.length ? (
              <div className="ticket-grid">
                {shown.map((t) => (
                  <button
                    className="card card-hover ticket-card"
                    key={t.id}
                    onClick={() =>
                      void run(async () => {
                        setSelected(await api<Ticket>(`/tickets/${t.id}`));
                      })
                    }
                  >
                    <div className="ticket-top">
                      <span className={`badge status-${t.status}`}>
                        {labels[t.status]}
                      </span>
                      <span className="ticket-ref">#{t.id}</span>
                    </div>
                    <div>
                      <h2 className="ticket-device">
                        {t.brand} {t.model}
                      </h2>
                      <p className="ticket-customer">
                        <User size={14} />
                        {t.customer_name}
                      </p>
                    </div>
                    <p className="ticket-issue">{t.reported_issue}</p>
                    <div className="ticket-foot">
                      <strong className="ticket-price money">
                        {money(Number(t.estimated_cost) + Number(t.parts_cost))}
                      </strong>
                      <Countdown
                        due={t.delivery_due_at}
                        status={t.status}
                        pausedSeconds={t.timer_remaining_seconds}
                      />
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Inbox}
                title="لا توجد طلبات في هذه القائمة"
                text="جرّب تعديل كلمة البحث أو سجّل جهازاً جديداً من قائمة استلام الجهاز."
              />
            )}
          </>
        )}

        {tab === "intake" && reception && (
          <form
            className="card card-pad form-section"
            onSubmit={form(async (v) => {
              const receiptData = await api<Receipt>("/tickets", "POST", v);
              setReceipt(receiptData);
              sfx.play("save");
              setTab("tickets");
            })}
          >
            <div>
              <p className="eyebrow">استقبال</p>
              <h2 className="card-title" style={{ fontSize: 20 }}>
                بيانات العميل والجهاز
              </h2>
            </div>
            <div className="form-grid">
              <Field label="اسم العميل" name="customer_name" required />
              <Field label="رقم الهاتف" name="customer_phone" required />
              <BrandSelect />
              <Field label="الموديل" name="model" required />
              <Field label="Serial / IMEI" name="serial_imei" />
              <Field
                label="رمز قفل الجهاز (اختياري)"
                name="device_passcode"
                type="password"
              />
              <label className="field">
                <span>نوع الإصلاح</span>
                <select name="repair_type" className="input">
                  <option value="standard">إصلاح عادي</option>
                  <option value="instant">إصلاح فوري</option>
                </select>
              </label>
            </div>
            <label className="field">
              <span>العطل المبلغ عنه</span>
              <textarea
                name="reported_issue"
                className="input"
                required
                maxLength={5000}
                placeholder="اوصف العطل الذي أبلغ عنه العميل…"
              />
            </label>
            <div className="form-actions">
              <button disabled={busy} className="btn btn-gold">
                <Plus size={16} />
                تسجيل الجهاز وإصدار الإيصال
              </button>
            </div>
          </form>
        )}

        {tab === "inventory" && (
          <div className="form-section">
            {admin && settings && (
              <section className="card card-pad inventory-approval-bar">
                <div>
                  <p className="eyebrow">ضبط المخزون</p>
                  <strong>
                    {settings.inventory_locked_at
                      ? "المخزون معتمد ومقفل"
                      : "المخزون ما زال قابلًا للتأسيس"}
                  </strong>
                </div>
                {!settings.inventory_locked_at && (
                  <button
                    className="btn btn-gold"
                    disabled={busy}
                    onClick={() =>
                      void run(async () => {
                        await api("/inventory/approve", "POST");
                      })
                    }
                  >
                    <ShieldCheck size={16} />
                    اعتماد المخزون
                  </button>
                )}
              </section>
            )}
            {admin && (
              <form
                className="card card-pad form-section"
                onSubmit={form(async (v) => {
                  await api("/inventory", "POST", v);
                })}
              >
                <div>
                  <p className="eyebrow">مخزون</p>
                  <h2 className="card-title" style={{ fontSize: 20 }}>
                    إضافة قطعة غيار
                  </h2>
                </div>
                <div className="form-grid">
                  <Field label="الاسم" name="name" required />
                  <Field label="SKU" name="sku" required />
                  <Field label="الفئة" name="category" required />
                  <Field
                    label="الكمية"
                    name="stock_quantity"
                    type="number"
                    required
                  />
                  <Field
                    label="حد التنبيه"
                    name="minimum_warning_limit"
                    type="number"
                    required
                  />
                  <Field
                    label="تكلفة الوحدة"
                    name="unit_cost"
                    type="number"
                    required
                  />
                  <Field
                    label="سعر البيع"
                    name="sale_price"
                    type="number"
                    required
                  />
                </div>
                {settings?.inventory_locked_at && (
                  <div className="alert alert-warning">
                    <ShieldCheck size={17} />
                    تم اعتماد المخزون. تغيير الكميات يتم فقط عبر فواتير الشراء والبيع.
                  </div>
                )}
                <div className="form-actions">
                  <button disabled={busy} className="btn btn-gold">
                    <Plus size={16} />
                    إضافة القطعة
                  </button>
                </div>
              </form>
            )}

            {parts.length ? (
              <div className="card table-wrap">
                <table>
                  <thead>
                    <tr>
                      {[
                        "الصنف",
                        "الفئة",
                        "الكمية",
                        "التكلفة",
                        ...(admin ? ["إدارة"] : []),
                      ].map((x) => (
                        <th key={x}>{x}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {parts.map((p) => {
                      const low =
                        p.stock_quantity <= p.minimum_warning_limit;
                      return (
                        <tr key={p.id}>
                          <td>
                            <strong>{p.name}</strong>
                            <small
                              className="block font-mono text-faint"
                              style={{ fontSize: 12 }}
                            >
                              {p.sku}
                            </small>
                          </td>
                          <td>
                            <span className="chip">{p.category}</span>
                          </td>
                          <td className={low ? "stock-low" : "num"}>
                            {p.stock_quantity}
                            {low ? " · منخفض" : ""}
                          </td>
                          <td className="num money">
                            <span className="block">شراء: {money(p.unit_cost)}</span>
                            <span className="block text-accent">بيع: {money(p.sale_price)}</span>
                          </td>
                          {admin && (
                            <td>
                              <form
                                className="row-actions"
                                onSubmit={form(async (v) => {
                                  await api(`/inventory/${p.id}`, "PUT", {
                                    ...p,
                                    stock_quantity: Number(v.qty),
                                  });
                                })}
                              >
                                <input
                                  aria-label="الكمية"
                                  className="input"
                                  name="qty"
                                  type="number"
                                  min="0"
                                  defaultValue={p.stock_quantity}
                                />
                                <button
                                  disabled={busy}
                                  className="btn btn-muted btn-sm"
                                >
                                  <Save size={14} />
                                  حفظ
                                </button>
                                <button
                                  disabled={busy}
                                  type="button"
                                  className="btn btn-danger btn-sm"
                                  onClick={() =>
                                    void run(async () => {
                                      await api(`/inventory/${p.id}`, "DELETE");
                                    })
                                  }
                                >
                                  <Trash2 size={14} />
                                  أرشفة
                                </button>
                              </form>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState
                icon={Boxes}
                title="المخزون فارغ"
                text="أضف أول قطعة غيار لتبدأ برصدها واستهلاكها أثناء الإصلاح."
              />
            )}
          </div>
        )}

        {tab === "settings" && admin && settings && (
          <form
            className="card card-pad form-section"
            style={{ maxWidth: 720 }}
            onSubmit={form(async (v) => {
              const file = v.logo instanceof File && v.logo.size ? v.logo : null;
              const logo = file ? await fileToDataUrl(file) : settings.logo;
              setSettings(
                await api("/settings", "PUT", {
                  name: v.name,
                  phone: v.phone,
                  address: v.address,
                  logo,
                }),
              );
            })}
          >
            <div>
              <p className="eyebrow">النظام</p>
              <h2 className="card-title" style={{ fontSize: 20 }}>
                بيانات الورشة
              </h2>
            </div>
            <Field
              label="اسم الورشة"
              name="name"
              defaultValue={settings.name}
              required
            />
            <Field
              label="هاتف الورشة"
              name="phone"
              defaultValue={settings.phone || ""}
            />
            <Field
              label="العنوان"
              name="address"
              defaultValue={settings.address || ""}
            />
            <label className="field">
              <span>شعار الورشة (PNG أو JPG)</span>
              <input className="input" name="logo" type="file" accept="image/png,image/jpeg,image/webp" />
            </label>
            {settings.logo && (
              <div className="settings-logo-preview">
                <img src={settings.logo} alt="الشعار الحالي" />
                <span className="text-muted">سيظهر هذا الشعار في الإيصالات.</span>
              </div>
            )}
            <div className="form-actions">
              <button disabled={busy} className="btn btn-gold">
                <Save size={16} />
                حفظ الإعدادات
              </button>
            </div>
          </form>
        )}

        {tab === "invoices" && reception && (
          <AccountingWorkspace
            parts={parts}
            invoices={invoices}
            busy={busy}
            onSave={(type, payload) => void run(() => saveInvoice(type, payload))}
          />
        )}

        {tab === "cashbox" && reception && cashbox && (
          <CashboxPanel cashbox={cashbox} busy={busy} onAction={(path, payload) => void run(async () => {
            await api(path, "POST", payload);
            if (user) await refresh(user);
          })} />
        )}

        {tab === "profits" && admin && profits && <ProfitPanel report={profits} />}

        {tab === "rewards" && (admin || tech) && (
          <div className="form-section">
            <section className="card card-pad">
              <p className="eyebrow">الإنجاز والتحفيز</p>
              <h2 className="card-title" style={{ fontSize: 22 }}>
                {admin ? "المكافآت والجوائز" : "تقدمي والمكافآت"}
              </h2>
              <p className="text-muted" style={{ margin: "8px 0 0" }}>
                {admin
                  ? "حدد عدد الأجهزة التي يجب إكمالها ليستحق كل فني المكافأة."
                  : "تابع عدد الأجهزة التي أكملتها واقترب من مكافأتك القادمة."}
              </p>
            </section>
            <div className="reward-grid">
              {rewards.map((reward) => (
                <article className={`card reward-card ${reward.close ? "reward-close" : ""}`} key={reward.id}>
                  <div className="reward-card-head">
                    <div className="user-avatar"><Trophy size={18} /></div>
                    <div>
                      <h3>{reward.name}</h3>
                      <p>{reward.desk_name || "فني"}</p>
                    </div>
                    {reward.close && <span className="badge status-awaiting_customer_approval">قريب من المكافأة</span>}
                  </div>
                  <div className="reward-numbers">
                    <strong>{reward.completed}</strong>
                    <span>/ {reward.target} جهاز مكتمل</span>
                  </div>
                  <div className="progress-track" aria-label={`التقدم ${reward.progress}%`}>
                    <span className="progress-bar" style={{ width: `${reward.progress}%` }} />
                  </div>
                  <div className="reward-foot">
                    <span>{reward.progress}% من الهدف</span>
                    <span>{reward.remaining ? `باقي ${reward.remaining}` : "استحق المكافأة"}</span>
                  </div>
                  {admin && (
                    <form
                      className="row-actions reward-target-form"
                      onSubmit={form(async (v) => {
                        await api(`/rewards/${reward.id}`, "PUT", { target: Number(v.target) });
                      })}
                    >
                      <label className="field" style={{ flex: 1 }}>
                        <span>هدف المكافأة</span>
                        <input className="input" name="target" type="number" min="1" defaultValue={reward.target} />
                      </label>
                      <button className="btn btn-muted btn-sm" disabled={busy}>
                        <Save size={14} />
                        حفظ الهدف
                      </button>
                    </form>
                  )}
                </article>
              ))}
            </div>
            {!rewards.length && <EmptyState icon={Trophy} title="لا يوجد فنيون نشطون" text="أضف فنيًا من صفحة الفريق لبدء تتبع المكافآت." />}
          </div>
        )}

        {tab === "staff" && admin && (
          <div className="form-section">
            <form
              className="card card-pad form-section"
              onSubmit={form(async (v) => {
                await api("/desks", "POST", v);
              })}
            >
              <div>
                <p className="eyebrow">طاولات العمل</p>
                <h2 className="card-title" style={{ fontSize: 20 }}>
                  إضافة طاولة وفني
                </h2>
              </div>
              <Field label="اسم الطاولة" name="name" required />
              <div className="form-grid">
                <Field label="اسم الفني" name="technician_name" required />
                <Field
                  label="البريد الإلكتروني للفني"
                  name="technician_email"
                  type="email"
                  required
                />
                <Field
                  label="كلمة مرور الفني (12 حرفاً على الأقل)"
                  name="technician_password"
                  type="password"
                  required
                />
              </div>
              <div className="form-actions">
                <button disabled={busy} className="btn btn-gold">
                  <Plus size={16} />
                  إضافة الطاولة والفني
                </button>
              </div>
            </form>

            <section className="card">
              <div className="card-head">
                <div>
                  <p className="eyebrow">التشغيل</p>
                  <h2 className="card-title">طاولات العمل</h2>
                </div>
                <span className="chip num">{desks.length} طاولة</span>
              </div>
              <div className="form-section" style={{ padding: 24 }}>
                {desks.length ? (
                  desks.map((d) => (
                    <form
                      className="card card-pad form-section"
                      key={d.id}
                      onSubmit={form(async (v) => {
                        const updates: Record<string, string | boolean> = {
                          name: String(v.name),
                          active: v.active === "on",
                        };
                        if (
                          v.technician_name ||
                          v.technician_email ||
                          v.technician_password
                        ) {
                          if (v.technician_name)
                            updates.technician_name = String(v.technician_name);
                          if (v.technician_email)
                            updates.technician_email = String(
                              v.technician_email,
                            );
                          if (v.technician_password)
                            updates.technician_password = String(
                              v.technician_password,
                            );
                        }
                        await api(`/desks/${d.id}`, "PUT", updates);
                      })}
                    >
                      <div
                        className="row-actions"
                        style={{ justifyContent: "space-between" }}
                      >
                        <label
                          className="field"
                          style={{ flex: 1, minWidth: 200 }}
                        >
                          <span>اسم الطاولة</span>
                          <input
                            name="name"
                            className="input"
                            defaultValue={d.name}
                          />
                        </label>
                        <label
                          className="field"
                          style={{ width: "auto", paddingTop: 26 }}
                        >
                          <span className="row-actions">
                            <input
                              name="active"
                              type="checkbox"
                              defaultChecked={d.active}
                            />
                            نشطة
                          </span>
                        </label>
                      </div>
                      {d.active && (
                        <div className="form-grid">
                          <Field
                            label="اسم الفني"
                            name="technician_name"
                            defaultValue={d.active_technician?.name || ""}
                            required={!d.active_technician}
                          />
                          <Field
                            label="البريد الإلكتروني للفني"
                            name="technician_email"
                            type="email"
                            defaultValue={d.active_technician?.email || ""}
                            required={!d.active_technician}
                          />
                          <Field
                            label={
                              d.active_technician
                                ? "كلمة مرور جديدة (اختياري، 12 حرفاً على الأقل)"
                                : "كلمة مرور الفني (12 حرفاً على الأقل)"
                            }
                            name="technician_password"
                            type="password"
                            required={!d.active_technician}
                          />
                        </div>
                      )}
                      <div className="form-actions">
                        <button disabled={busy} className="btn btn-muted">
                          <Save size={15} />
                          حفظ الطاولة والفني
                        </button>
                      </div>
                    </form>
                  ))
                ) : (
                  <EmptyState
                    icon={Users}
                    title="لا توجد طاولات بعد"
                    text="أضف أول طاولة عمل مع الفني المسؤول عنها."
                  />
                )}
              </div>
            </section>

            <form
              className="card card-pad form-section"
              onSubmit={form(async (v) => {
                await api("/users", "POST", {
                  ...v,
                  desk_id: v.desk_id ? Number(v.desk_id) : null,
                });
              })}
            >
              <div>
                <p className="eyebrow">الصلاحيات</p>
                <h2 className="card-title" style={{ fontSize: 20 }}>
                  إضافة موظف
                </h2>
              </div>
              <div className="form-grid">
                <Field label="الاسم" name="name" required />
                <Field
                  label="البريد الإلكتروني"
                  name="email"
                  type="email"
                  required
                />
                <Field
                  label="كلمة المرور (12 حرفاً على الأقل)"
                  name="password"
                  type="password"
                  required
                />
                <label className="field">
                  <span>الدور</span>
                  <select className="input" name="role">
                    {[
                      "RECEPTION",
                      "DIAGNOSIS_DESK",
                      "TECHNICIAN_DESK",
                      "ADMIN",
                    ].map((r) => (
                      <option key={r}>{r}</option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>الطاولة</span>
                  <select className="input" name="desk_id">
                    <option value="">بدون طاولة</option>
                    {desks
                      .filter((d) => d.active)
                      .map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                  </select>
                </label>
              </div>
              <div className="form-actions">
                <button disabled={busy} className="btn btn-gold">
                  <Plus size={16} />
                  إضافة الموظف
                </button>
              </div>
            </form>

            {[
              ["الفريق الحالي", staff],
              ["أرشيف الموظفين", former],
            ].map(([title, list]) => (
              <section className="card" key={String(title)}>
                <div className="card-head">
                  <h2 className="card-title">{String(title)}</h2>
                  <span className="chip num">{(list as TUser[]).length}</span>
                </div>
                <div style={{ padding: "6px 0" }}>
                  {(list as TUser[]).length ? (
                    (list as TUser[]).map((s) => (
                      <div
                        className="row-actions"
                        style={{
                          justifyContent: "space-between",
                          padding: "14px 24px",
                          borderBottom: "1px solid var(--line)",
                        }}
                        key={s.id}
                      >
                        <div className="row-actions">
                          <div className="user-avatar">
                            {s.name.trim().charAt(0)}
                          </div>
                          <div>
                            <strong style={{ fontWeight: 800 }}>
                              {s.name}
                            </strong>
                            <p
                              className="font-mono text-faint"
                              style={{ margin: 0, fontSize: 12 }}
                            >
                              #{s.id} · {s.role} · {s.email}
                            </p>
                          </div>
                        </div>
                        {s.id !== user.id && (
                          <button
                            disabled={busy}
                            className={`btn btn-sm ${s.active ? "btn-danger" : "btn-muted"}`}
                            onClick={() =>
                              void run(async () => {
                                await api(`/users/${s.id}`, "PUT", {
                                  active: !s.active,
                                });
                              })
                            }
                          >
                            {s.active ? "أرشفة" : "استعادة"}
                          </button>
                        )}
                      </div>
                    ))
                  ) : (
                    <EmptyState
                      icon={Users}
                      title="لا يوجد موظفون"
                      text="أضف موظفين لمنحهم صلاحيات الوصول إلى النظام."
                    />
                  )}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>

      {selected && (
        <div className="modal-backdrop">
          <section className="modal" role="dialog" aria-modal="true">
            <header className="modal-head">
              <div>
                <p className="eyebrow">
                  طلب #{selected.id} · {selected.reference}
                </p>
                <h2>
                  {selected.brand} {selected.model}
                </h2>
                <span
                  className={`badge status-${selected.status}`}
                  style={{ marginTop: 8 }}
                >
                  {labels[selected.status]}
                </span>
              </div>
              <button
                aria-label="إغلاق"
                className="close-btn"
                onClick={() => setSelected(null)}
              >
                <X size={18} />
              </button>
            </header>

            <div className="modal-body">
              {error && (
                <div role="alert" className="alert alert-error">
                  <AlertTriangle size={17} />
                  {error}
                </div>
              )}
              {tech && selected.status === "in_repair" && selected.delivery_due_at && (
                <RepairWarning due={selected.delivery_due_at} />
              )}

              <div className="kv">
                <div className="kv-item">
                  <span>العميل</span>
                  <strong>{selected.customer_name}</strong>
                </div>
                <div className="kv-item">
                  <span>الهاتف</span>
                  <strong dir="ltr">
                    {selected.customer_phone}
                  </strong>
                </div>
                <div className="kv-item">
                  <span>التكلفة الإجمالية</span>
                  <strong className="text-gold money">
                    {money(
                      Number(selected.estimated_cost) +
                        Number(selected.parts_cost),
                    )}
                  </strong>
                </div>
                <div className="kv-item">
                  <span>الموعد المتبقي</span>
                  <strong>
                    <Countdown
                      due={selected.delivery_due_at}
                      status={selected.status}
                      pausedSeconds={selected.timer_remaining_seconds}
                    />
                  </strong>
                </div>
              </div>

              <div className="modal-section">
                <h3>العطل المبلغ عنه</h3>
                <div className="note-box">{selected.reported_issue}</div>
              </div>

              {selected.device_passcode && (
                <div className="modal-section">
                  <h3>رمز قفل الجهاز</h3>
                  <div className="note-box">
                    <code>{selected.device_passcode}</code>
                  </div>
                </div>
              )}

              {selected.diagnosis && (
                <div className="modal-section">
                  <h3>نتيجة التشخيص</h3>
                  <div className="note-box">{selected.diagnosis}</div>
                </div>
              )}

              {diagnosis &&
                ["pending_diagnosis", "awaiting_customer_approval"].includes(
                  selected.status,
                ) && (
                  <form
                    className="modal-section"
                    onSubmit={form(async (v) =>
                      update({
                        ...v,
                        estimated_cost: Number(v.estimated_cost),
                        status: "awaiting_customer_approval",
                      }),
                    )}
                  >
                    <h3>إدخال التشخيص</h3>
                    <label className="field">
                      <span>نتيجة التشخيص</span>
                      <textarea
                        className="input"
                        name="diagnosis"
                        defaultValue={selected.diagnosis || ""}
                        required
                      />
                    </label>
                    <Field
                      label="تكلفة الخدمة (تضاف تكلفة القطع تلقائياً)"
                      name="estimated_cost"
                      type="number"
                      defaultValue={selected.estimated_cost}
                      required
                    />
                    <div className="form-actions">
                      <button disabled={busy} className="btn btn-gold">
                        <CheckCircle2 size={16} />
                        حفظ وإرسال لانتظار الموافقة
                      </button>
                    </div>
                  </form>
                )}

              {reception && selected.status === "awaiting_customer_approval" && (
                <div className="modal-section">
                  <h3>موافقة العميل والتحويل</h3>
                  <button
                    disabled={busy || !!selected.approved_at}
                    className={`btn ${selected.approved_at ? "btn-muted" : "btn-gold"}`}
                    onClick={() =>
                      void run(async () => update({ approved: true }))
                    }
                  >
                    {selected.approved_at ? (
                      <>
                        <CheckCircle2 size={16} />
                        تم تسجيل موافقة العميل
                      </>
                    ) : (
                      "تأكيد موافقة العميل"
                    )}
                  </button>
                  {selected.approved_at && (
                    <form
                      className="form-grid"
                      onSubmit={form(async (v) => {
                        await api(
                          `/tickets/${selected.id}/route-desk`,
                          "PUT",
                          {
                            desk_id: Number(v.desk_id),
                            technician_id: Number(v.technician_id),
                          },
                        );
                        sfx.play("deliver");
                        setSelected(
                          await api<Ticket>(`/tickets/${selected.id}`),
                        );
                      })}
                    >
                      <label className="field">
                        <span>الطاولة</span>
                        <select className="input" name="desk_id" required>
                          {desks
                            .filter((d) => d.active)
                            .map((d) => (
                              <option key={d.id} value={d.id}>
                                {d.name}
                              </option>
                            ))}
                        </select>
                      </label>
                      <label className="field">
                        <span>الفني المسؤول</span>
                        <select className="input" name="technician_id" required>
                          {technicians.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.name} ·{" "}
                              {desks.find((d) => d.id === t.desk_id)?.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <div className="form-actions span-full">
                        <button disabled={busy} className="btn btn-gold">
                          تحويل إلى الطاولة
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}

              {(tech || admin) &&
                selected.status === "assigned_to_desk" &&
                !selected.unlocked_at && (
                <form
                  className="modal-section"
                  onSubmit={form(async (v) => {
                    await api(
                      `/tickets/${selected.id}/verify-code`,
                      "POST",
                      v,
                    );
                    setSelected(
                      await api<Ticket>(`/tickets/${selected.id}`),
                    );
                  })}
                >
                  <h3>التحقق من الجهاز</h3>
                  <Field
                    label="رمز أمان الطاولة من الإيصال B"
                    name="code"
                    required
                  />
                  <div className="form-actions">
                    <button disabled={busy} className="btn btn-gold">
                      <ShieldCheck size={16} />
                      تحقق من الرمز
                    </button>
                  </div>
                </form>
              )}

              {(tech || admin) &&
                ((selected.status === "assigned_to_desk" && selected.unlocked_at) ||
                  selected.status === "awaiting_parts") && (
                <form
                  className="modal-section"
                  onSubmit={form(async (v) => {
                    await api(`/tickets/${selected.id}/start-repair`, "POST", {
                      ...(v.delivery_minutes
                        ? { delivery_minutes: Number(v.delivery_minutes) }
                        : {}),
                    });
                    setSelected(await api<Ticket>(`/tickets/${selected.id}`));
                  })}
                >
                  <h3>
                    {selected.status === "awaiting_parts"
                      ? "استئناف الإصلاح"
                      : "بدء الإصلاح"}
                  </h3>
                  {selected.status === "awaiting_parts" ? (
                    <div className="alert alert-warning">
                      <Clock size={17} />
                      المؤقت متوقف حتى تتوفر القطعة المطلوبة.
                    </div>
                  ) : (
                    <Field
                      label="مدة الإصلاح بالدقائق"
                      name="delivery_minutes"
                      type="number"
                      required
                    />
                  )}
                  <div className="form-actions">
                    <button disabled={busy} className="btn btn-gold">
                      <Wrench size={16} />
                      {selected.status === "awaiting_parts"
                        ? "بدء الإصلاح واستئناف المؤقت"
                        : "بدء الإصلاح"}
                    </button>
                  </div>
                </form>
              )}

              {(tech || admin) &&
                selected.status === "in_repair" &&
                selected.unlocked_at && (
                  <form
                    className="modal-section"
                    onSubmit={form(async (v) =>
                      update({
                        notes: v.notes,
                        ...(v.delivery_minutes
                          ? { delivery_minutes: Number(v.delivery_minutes) }
                          : {}),
                      }),
                    )}
                  >
                    <h3>متابعة الإصلاح</h3>
                    <div className="form-grid">
                      <Field
                        label="المدة المتبقية بالدقائق"
                        name="delivery_minutes"
                        type="number"
                      />
                      <label className="field">
                        <span>ملاحظات الإصلاح</span>
                        <textarea
                          className="input"
                          name="notes"
                          defaultValue={selected.notes || ""}
                        />
                      </label>
                    </div>
                    <div className="form-actions">
                      <button disabled={busy} className="btn btn-muted">
                        <Save size={15} />
                        حفظ الملاحظات والموعد
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        className="btn btn-gold"
                        onClick={() =>
                          void run(async () =>
                            update({ status: "ready_for_delivery" }),
                          )
                        }
                      >
                        <PackageCheck size={16} />
                        جاهز للتسليم
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        className="btn btn-muted"
                        onClick={() =>
                          void run(async () => update({ status: "awaiting_parts" }))
                        }
                      >
                        <Package size={16} />
                        بانتظار قطعة
                      </button>
                    </div>
                  </form>
                )}

              {((diagnosis &&
                ["pending_diagnosis", "awaiting_customer_approval"].includes(
                  selected.status,
                )) ||
                ((tech || admin) &&
                   ["awaiting_parts", "in_repair"].includes(selected.status) &&
                   selected.unlocked_at)) && (
                <form
                  className="modal-section"
                  onSubmit={form(async (v) => {
                    await api(
                      `/tickets/${selected.id}/consume-parts`,
                      "POST",
                      {
                        parts: [
                          {
                            inventory_item_id: Number(v.part),
                            quantity: Number(v.quantity),
                          },
                        ],
                      },
                    );
                    setSelected(
                      await api<Ticket>(`/tickets/${selected.id}`),
                    );
                  })}
                >
                  <h3>صرف قطعة غيار</h3>
                  <div className="form-grid">
                    <label className="field">
                      <span>القطعة</span>
                      <select className="input" name="part" required>
                        {parts
                          .filter((p) => p.stock_quantity > 0)
                          .map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} · {p.stock_quantity} متوفر
                            </option>
                          ))}
                      </select>
                    </label>
                    <Field
                      label="الكمية"
                      name="quantity"
                      type="number"
                      defaultValue="1"
                      required
                    />
                  </div>
                  <div className="form-actions">
                    <button disabled={busy} className="btn btn-muted">
                      <Boxes size={15} />
                      صرف من المخزون
                    </button>
                  </div>
                </form>
              )}
            </div>

            {reception ||
            selected.status === "ready_for_delivery" ||
            (admin && !["delivered", "cancelled"].includes(selected.status)) ? (
              <footer className="modal-foot">
                {reception && (
                  <button
                    disabled={busy}
                    className="btn btn-muted"
                    onClick={() =>
                      void run(async () => openReceipt(selected.id))
                    }
                  >
                    <Printer size={16} />
                    عرض الإيصال
                  </button>
                )}
                {selected.status === "ready_for_delivery" && (
                  <>
                    <a
                      className="btn btn-muted"
                      target="_blank"
                      rel="noopener noreferrer"
                      href={`https://wa.me/${selected.customer_phone.replace(/\D/g, "")}?text=${encodeURIComponent(`مرحباً ${selected.customer_name}، جهازك ${selected.brand} ${selected.model} جاهز للاستلام. رقم الطلب ${selected.reference}`)}`}
                    >
                      <MessageCircle size={16} />
                      إشعار واتساب
                    </a>
                    {reception && (
                      <button
                        disabled={busy}
                        className="btn btn-gold"
                        onClick={() =>
                          void run(async () => {
                            await api(
                              `/tickets/${selected.id}/checkout`,
                              "PUT",
                            );
                            setSelected(null);
                          })
                        }
                      >
                        <CheckCircle2 size={16} />
                        تأكيد التسليم
                      </button>
                    )}
                  </>
                )}
                {admin &&
                  !["delivered", "cancelled"].includes(selected.status) && (
                    <button
                      disabled={busy}
                      className="btn btn-danger"
                      onClick={() =>
                        void run(async () => update({ status: "cancelled" }))
                      }
                    >
                      <Trash2 size={15} />
                      إلغاء الطلب
                    </button>
                  )}
              </footer>
            ) : null}
          </section>
        </div>
      )}

      {receipt && (
        <div className="modal-backdrop">
          <section className="modal" role="dialog" aria-modal="true">
            <header className="modal-head">
              <div>
                <p className="eyebrow">تم التسجيل بنجاح</p>
                <h2>إيصال استلام الجهاز</h2>
              </div>
              <button
                aria-label="إغلاق"
                className="close-btn"
                onClick={() => setReceipt(null)}
              >
                <X size={18} />
              </button>
            </header>
            <div className="modal-body">
              <div className="receipt-grid print-receipt">
                {["A", "B"].map((part) => (
                  <article key={part} className="receipt-paper">
                    <div
                      className="row-actions"
                      style={{ justifyContent: "space-between" }}
                    >
                      <div className="receipt-brand">
                        {receipt.logo && (
                          <img
                            src={receipt.logo}
                            alt="شعار الورشة"
                            className="receipt-logo"
                          />
                        )}
                        <h2 style={{ margin: 0, fontSize: 17, fontWeight: 900 }}>
                          {receipt.workshop_name || "نواة للصيانة"}
                        </h2>
                      </div>
                      <span className="receipt-tag">
                        {part === "A" ? "نسخة العميل · A" : "طاولة العمل · B"}
                      </span>
                    </div>
                    <p
                      className="font-mono text-faint"
                      style={{ fontSize: 12, margin: "10px 0 0" }}
                    >
                      {receipt.ticket.reference}
                    </p>
                    <h3 style={{ margin: "14px 0 6px", fontWeight: 800 }}>
                      {receipt.ticket.brand} {receipt.ticket.model}
                    </h3>
                    <p style={{ margin: "0 0 8px" }}>
                      {receipt.ticket.customer_name}
                    </p>
                    <p
                      className="text-muted"
                      style={{ margin: "0 0 16px", fontSize: 13.5 }}
                    >
                      {receipt.ticket.reported_issue}
                    </p>
                    {part === "A" ? (
                      <>
                        <QRCodeSVG
                          value={receipt.part_a.tracking_url}
                          size={124}
                        />
                        <p
                          className="text-faint"
                          style={{ fontSize: 13, marginTop: 12 }}
                        >
                          امسح لمتابعة حالة الإصلاح
                        </p>
                        <p className="eyebrow" style={{ margin: "14px 0 4px" }}>
                          رمز أمان الطاولة
                        </p>
                        <strong className="receipt-code">
                          {receipt.part_a.security_code || "غير متوفر"}
                        </strong>
                      </>
                    ) : (
                      <>
                        <p
                          className="eyebrow"
                          style={{ marginBottom: 4 }}
                        >
                          رمز أمان الطاولة
                        </p>
                        <strong className="receipt-code">
                          {receipt.part_b.security_code}
                        </strong>
                        <p
                          className="text-faint"
                          style={{ fontSize: 13, marginTop: 12 }}
                        >
                          احتفظ بهذه النسخة؛ لا يمكن استرجاع الرمز.
                        </p>
                      </>
                    )}
                  </article>
                ))}
              </div>
            </div>
            <footer className="modal-foot">
              <button className="btn btn-gold" onClick={() => window.print()}>
                <Printer size={16} />
                طباعة النسختين
              </button>
              <button
                className="btn btn-muted"
                onClick={() => setReceipt(null)}
              >
                إغلاق
              </button>
            </footer>
          </section>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  ...props
}: { label: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        className="input"
        min={props.type === "number" ? 0 : undefined}
        step={props.type === "number" ? "any" : undefined}
        {...props}
      />
    </label>
  );
}

const PHONE_BRANDS = [
  "Apple",
  "Samsung",
  "Xiaomi",
  "Redmi",
  "POCO",
  "Huawei",
  "Honor",
  "OnePlus",
  "Oppo",
  "Realme",
  "Vivo",
  "Nokia",
  "Motorola",
  "Google Pixel",
  "Sony",
  "LG",
  "HTC",
  "Asus",
  "Lenovo",
  "ZTE",
  "TCL",
  "Tecno",
  "Infinix",
  "Itel",
  "Meizu",
  "Nothing",
  "BlackBerry",
  "Alcatel",
  "Microsoft Surface",
  "Acer",
  "Dell",
  "HP",
  "Microsoft",
  "Nintendo",
  "PlayStation",
  "Xbox",
  "Other / أخرى",
];

function BrandSelect() {
  return (
    <label className="field">
      <span>الشركة / النوع</span>
      <input
        className="input"
        name="brand"
        list="phone-brands"
        required
        placeholder="ابحث واختر الشركة…"
        autoComplete="off"
      />
      <datalist id="phone-brands">
        {PHONE_BRANDS.map((brand) => (
          <option key={brand} value={brand} />
        ))}
      </datalist>
    </label>
  );
}

type InvoiceKind = "purchase" | "sale" | "purchase_return" | "sale_return";
type InvoiceLineDraft = { inventory_item_id: number; quantity: number; unit_price: number };

function AccountingWorkspace({
  parts,
  invoices,
  busy,
  onSave,
}: {
  parts: Part[];
  invoices: AccountingInvoice[];
  busy: boolean;
  onSave: (type: InvoiceKind, payload: unknown) => void;
}) {
  const [kind, setKind] = useState<InvoiceKind>("purchase");
  const [counterparty, setCounterparty] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [currency, setCurrency] = useState<"USD" | "SYP">("USD");
  const [rate, setRate] = useState(1);
  const [originalId, setOriginalId] = useState("");
  const [lines, setLines] = useState<InvoiceLineDraft[]>([
    { inventory_item_id: parts[0]?.id || 0, quantity: 1, unit_price: Number(parts[0]?.unit_cost || 0) },
  ]);
  const isReturn = kind.endsWith("_return");
  const originalType = kind === "purchase_return" ? "purchase" : "sale";
  const originals = invoices.filter((i) => i.type === originalType);
  const total = lines.reduce((sum, line) => sum + line.quantity * line.unit_price, 0);

  const selectKind = (next: InvoiceKind) => {
    setKind(next);
    setOriginalId("");
    setLines([{ inventory_item_id: parts[0]?.id || 0, quantity: 1, unit_price: Number(parts[0]?.[next === "sale" || next === "sale_return" ? "sale_price" : "unit_cost"] || 0) }]);
  };

  const setProduct = (index: number, itemId: number) => {
    const item = parts.find((p) => p.id === itemId);
    setLines((current) => current.map((line, i) => i === index ? {
      ...line,
      inventory_item_id: itemId,
      unit_price: Number(item?.[kind === "sale" || kind === "sale_return" ? "sale_price" : "unit_cost"] || 0),
    } : line));
  };

  const loadOriginal = (id: string) => {
    setOriginalId(id);
    const original = invoices.find((i) => i.id === Number(id));
    if (original?.lines?.length) {
      setLines(original.lines.map((line) => ({
        inventory_item_id: line.inventory_item_id,
        quantity: line.quantity,
        unit_price: Number(line.unit_price),
      })));
    }
  };

  return (
    <div className="form-section">
      <section className="card card-pad">
        <p className="eyebrow">المحاسبة</p>
        <h2 className="card-title" style={{ fontSize: 22 }}>الفواتير المعتمدة</h2>
        <div className="invoice-type-tabs">
          {([
            ["purchase", "فاتورة شراء"],
            ["sale", "فاتورة مبيعات"],
            ["purchase_return", "إرجاع مشتريات"],
            ["sale_return", "إرجاع مبيعات"],
          ] as [InvoiceKind, string][]).map(([value, label]) => (
            <button key={value} type="button" className={`btn btn-sm ${kind === value ? "btn-gold" : "btn-muted"}`} onClick={() => selectKind(value)}>
              {label}
            </button>
          ))}
        </div>
      </section>
      <form className="card card-pad form-section" onSubmit={(event) => {
        event.preventDefault();
        onSave(kind, {
          invoice_number: invoiceNumber || null,
          counterparty_name: counterparty || null,
          currency,
          exchange_rate: Number(rate),
          ...(isReturn ? { original_invoice_id: Number(originalId) } : {}),
          items: lines,
        });
      }}>
        <div className="form-grid">
          <Field label={kind === "purchase" || kind === "purchase_return" ? "اسم المورد" : "اسم العميل"} name="counterparty" value={counterparty} onChange={(e) => setCounterparty(e.target.value)} required />
          <Field label="رقم الفاتورة" name="invoice_number" value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} />
          <label className="field"><span>العملة</span><select className="input" value={currency} onChange={(e) => setCurrency(e.target.value as "USD" | "SYP")}><option value="USD">دولار أمريكي</option><option value="SYP">ليرة سورية</option></select></label>
          <Field label="سعر الدولار اليوم" name="exchange_rate" type="number" value={String(rate)} onChange={(e) => setRate(Number(e.target.value))} required />
        </div>
        {isReturn && <label className="field"><span>الفاتورة الأصلية</span><select className="input" value={originalId} onChange={(e) => loadOriginal(e.target.value)} required><option value="">اختر الفاتورة الأصلية</option>{originals.map((invoice) => <option key={invoice.id} value={invoice.id}>#{invoice.id} · {invoice.counterparty_name || "بدون اسم"} · {invoice.total} {invoice.currency}</option>)}</select></label>}
        <div className="invoice-lines">
          {lines.map((line, index) => (
            <div className="invoice-line" key={`${index}-${line.inventory_item_id}`}>
              <label className="field"><span>المادة</span><select className="input" value={line.inventory_item_id} onChange={(e) => setProduct(index, Number(e.target.value))}>{parts.map((part) => <option key={part.id} value={part.id}>{part.name} · {part.sku}</option>)}</select></label>
              <Field label="الكمية" name={`qty-${index}`} type="number" min="1" value={String(line.quantity)} onChange={(e) => setLines((current) => current.map((x, i) => i === index ? { ...x, quantity: Number(e.target.value) } : x))} required />
              <Field label="السعر الإفرادي" name={`price-${index}`} type="number" value={String(line.unit_price)} onChange={(e) => setLines((current) => current.map((x, i) => i === index ? { ...x, unit_price: Number(e.target.value) } : x))} required />
              <strong className="invoice-line-total">{money(line.quantity * line.unit_price)}</strong>
              <button type="button" className="btn btn-danger btn-sm" disabled={lines.length === 1} onClick={() => setLines((current) => current.filter((_, i) => i !== index))}>حذف</button>
            </div>
          ))}
        </div>
        <div className="form-actions"><button type="button" className="btn btn-muted" onClick={() => setLines((current) => [...current, { inventory_item_id: parts[0]?.id || 0, quantity: 1, unit_price: 0 }])}><Plus size={15} /> إضافة بند</button></div>
        <div className="invoice-total"><span>إجمالي الفاتورة</span><strong>{money(total)} {currency}</strong></div>
        <button className="btn btn-gold" disabled={busy || !parts.length}><CheckCircle2 size={16} /> اعتماد الفاتورة وتحديث المخزون والصندوق</button>
      </form>
      <section className="card table-wrap"><table><thead><tr><th>النوع</th><th>الطرف</th><th>الإجمالي</th><th>التاريخ</th></tr></thead><tbody>{invoices.slice(0, 30).map((invoice) => <tr key={invoice.id}><td>{invoice.type}</td><td>{invoice.counterparty_name || "-"}</td><td>{invoice.total} {invoice.currency}</td><td>{new Date(invoice.created_at).toLocaleDateString("ar-SY")}</td></tr>)}</tbody></table></section>
    </div>
  );
}

function CashboxPanel({
  cashbox,
  busy,
  onAction,
}: {
  cashbox: Cashbox;
  busy: boolean;
  onAction: (path: string, payload: unknown) => void;
}) {
  const [from, setFrom] = useState<"USD" | "SYP">("USD");
  const [amount, setAmount] = useState(0);
  const [rate, setRate] = useState(0);
  const [category, setCategory] = useState<"expense" | "wage">("expense");
  const [box, setBox] = useState<"USD" | "SYP">("USD");
  const [description, setDescription] = useState("");
  const converted = from === "USD" ? amount * rate : rate ? amount / rate : 0;
  return (
    <div className="form-section">
      <div className="cashbox-grid"><div className="card cashbox-card"><span>صندوق الدولار</span><strong>{cashbox.usd.toFixed(2)} $</strong></div><div className="card cashbox-card"><span>صندوق الليرة السورية</span><strong>{cashbox.syp.toFixed(2)} ل.س</strong></div></div>
      <section className="card card-pad form-section"><h2 className="card-title">مصروف أو أجر فني</h2><div className="form-grid"><label className="field"><span>النوع</span><select className="input" value={category} onChange={(e) => setCategory(e.target.value as "expense" | "wage")}><option value="expense">مصروف</option><option value="wage">أجر فني</option></select></label><label className="field"><span>الصندوق</span><select className="input" value={box} onChange={(e) => setBox(e.target.value as "USD" | "SYP")}><option value="USD">دولار</option><option value="SYP">ليرة سورية</option></select></label><Field label="المبلغ" name="cash-amount" type="number" value={String(amount)} onChange={(e) => setAmount(Number(e.target.value))} required /><Field label="البيان" name="cash-description" value={description} onChange={(e) => setDescription(e.target.value)} required /></div><button className="btn btn-danger" disabled={busy} onClick={() => onAction(`/accounting/cashbox/${category}`, { box, amount, exchange_rate: rate || 1, description })}><Wallet size={16} /> تسجيل الصرف</button></section>
      <section className="card card-pad form-section"><h2 className="card-title">تحويل بين الصندوقين</h2><div className="form-grid"><label className="field"><span>نوع التحويل</span><select className="input" value={from} onChange={(e) => setFrom(e.target.value as "USD" | "SYP")}><option value="USD">من دولار إلى ليرة سورية</option><option value="SYP">من ليرة سورية إلى دولار</option></select></label><Field label="المبلغ المراد تحويله" name="convert-amount" type="number" value={String(amount)} onChange={(e) => setAmount(Number(e.target.value))} required /><Field label="قيمة الدولار اليوم" name="convert-rate" type="number" value={String(rate)} onChange={(e) => setRate(Number(e.target.value))} required /></div><div className="invoice-total"><span>المبلغ الناتج</span><strong>{converted.toFixed(2)} {from === "USD" ? "ل.س" : "$"}</strong></div><button className="btn btn-gold" disabled={busy || amount <= 0 || rate <= 0} onClick={() => onAction("/accounting/cashbox/convert", { from, amount, exchange_rate: rate })}><ArrowLeftRight size={16} /> تنفيذ التحويل</button></section>
    </div>
  );
}

function ProfitPanel({ report }: { report: ProfitReport }) {
  const values = [
    ["إيرادات المبيعات", report.sales_revenue],
    ["تكلفة المبيعات", -report.sales_cost],
    ["إيرادات الإصلاحات", report.repair_revenue],
    ["تكلفة قطع الإصلاح", -report.repair_parts_cost],
    ["المصاريف والأجور", -report.expenses_and_wages],
  ] as const;
  return <div className="form-section"><section className="card card-pad"><p className="eyebrow">خاص بالAdmin</p><h2 className="card-title" style={{ fontSize: 22 }}>الأرباح الصافية</h2><div className="profit-total">{money(report.net_profit)}</div></section><div className="stats-grid">{values.map(([label, value]) => <StatCard key={label} icon={TrendingUp} label={label} value={Number(value)} hint="محسوب بالدولار" accent={value >= 0} />)}</div></div>;
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("تعذر قراءة ملف الشعار"));
    reader.readAsDataURL(file);
  });
}

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  accent,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  hint?: string;
  accent?: boolean;
}) {
  return (
    <div className="card stat-card">
      <div className="stat-ico">
        <Icon size={20} />
      </div>
      <div className="stat-body">
        <p className="stat-label">{label}</p>
        <strong className={`stat-value ${accent ? "is-accent" : ""}`}>
          {value}
        </strong>
        {hint && <p className="stat-hint">{hint}</p>}
      </div>
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  text,
}: {
  icon: LucideIcon;
  title: string;
  text?: string;
}) {
  return (
    <div className="empty-state">
      <div className="empty-ico">
        <Icon size={26} />
      </div>
      <strong>{title}</strong>
      {text && <p>{text}</p>}
    </div>
  );
}

function secondsUntil(due: string | null): number {
  return due ? Math.max(0, Math.floor((Date.parse(due) - Date.now()) / 1000)) : 0;
}

function RepairWarning({ due }: { due: string }) {
  const [seconds, setSeconds] = useState(() => secondsUntil(due));
  useEffect(() => {
    const timer = setInterval(() => setSeconds(secondsUntil(due)), 1000);
    return () => clearInterval(timer);
  }, [due]);
  if (seconds <= 0 || seconds > 600) return null;
  return (
    <div className="alert alert-warning">
      <AlertTriangle size={17} />
      اقترب موعد انتهاء الإصلاح — تبقى أقل من 10 دقائق.
    </div>
  );
}

function Countdown({
  due,
  status,
  pausedSeconds,
}: {
  due: string | null;
  status?: string;
  pausedSeconds?: number | null;
}) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  if (status === "awaiting_parts")
    return (
      <span className="countdown is-soon">
        <Package size={13} />
        المؤقت متوقف
        {pausedSeconds ? ` · ${Math.ceil(pausedSeconds / 60)} د` : ""}
      </span>
    );
  if (!due)
    return (
      <span className="countdown">
        <Clock size={13} />
        لم يحدد الموعد
      </span>
    );
  const s = Math.max(0, Math.floor((Date.parse(due) - now) / 1000));
  const cls = s === 0 ? "is-late" : s < 3600 ? "is-soon" : "";
  return (
    <span className={`countdown ${cls}`} dir="ltr">
      <Clock size={13} />
      {Math.floor(s / 3600)}:
      {String(Math.floor((s % 3600) / 60)).padStart(2, "0")}:
      {String(s % 60).padStart(2, "0")}
    </span>
  );
}
