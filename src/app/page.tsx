"use client";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { Cpu, LogOut, RefreshCw, Printer, ShieldCheck } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import {
  api,
  all,
  token,
  User,
  Ticket,
  Part,
  Desk,
  labels,
  money,
} from "../lib/api";
type Receipt = {
  ticket: Ticket;
  part_a: { tracking_url: string };
  part_b: { security_code: string };
};
export default function Home() {
  const [user, setUser] = useState<User | null>(null),
    [loading, setLoading] = useState(true),
    [tab, setTab] = useState("tickets"),
    [tickets, setTickets] = useState<Ticket[]>([]),
    [parts, setParts] = useState<Part[]>([]),
    [desks, setDesks] = useState<Desk[]>([]),
    [staff, setStaff] = useState<User[]>([]),
    [former, setFormer] = useState<User[]>([]),
    [selected, setSelected] = useState<Ticket | null>(null),
    [receipt, setReceipt] = useState<Receipt | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [search, setSearch] = useState(""),
    [count, setCount] = useState(0);
  const [technicians, setTechnicians] = useState<
    { id: number; name: string; desk_id: number }[]
  >([]);
  const [settings, setSettings] = useState<{
    name: string;
    phone: string | null;
    address: string | null;
  } | null>(null);
  const refresh = useCallback(async (u: User) => {
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
        all<User>("/staff?type=current"),
        all<User>("/staff?type=former"),
      ]);
      setStaff(a);
      setFormer(b);
      setSettings(await api("/settings"));
    }
    if (u.role !== "TECHNICIAN_DESK") {
      const q = await api<{ count: number }>("/tickets/diagnosis-queue");
      setCount(q.count);
      if (u.role === "ADMIN" || u.role === "RECEPTION")
        setTechnicians(await api("/technicians"));
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
      api<User>("/auth/me")
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
  const run = async (fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await fn();
      if (user && token.get()) await refresh(user);
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذر تنفيذ العملية");
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
  if (loading)
    return <main className="auth-screen">جاري التحقق من الجلسة…</main>;
  if (!user)
    return (
      <main className="auth-screen" dir="rtl">
        <form
          className="glass auth-card space-y-5"
          onSubmit={form(async (v) => {
            const r = await api<{ token: string; user: User }>(
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
          <div className="brand-mark">
            <Cpu size={30} />
          </div>
          <h1 className="text-3xl font-black">
            نواة <span className="text-gold">للصيانة</span>
          </h1>
          <p className="text-slate-300">تسجيل الدخول إلى مساحة العمل</p>
          <Field label="البريد الإلكتروني" name="email" type="email" required />
          <Field label="كلمة المرور" name="password" type="password" required />
          {error && (
            <p role="alert" className="error-box">
              {error}
            </p>
          )}
          <button disabled={busy} className="btn btn-gold w-full">
            {busy ? "جاري الدخول…" : "تسجيل الدخول"}
          </button>
          <p className="text-sm text-slate-400">
            <ShieldCheck className="inline ml-2" size={17} />
            صلاحيات مرتبطة بالدور وطاولة العمل
          </p>
        </form>
      </main>
    );
  const admin = user.role === "ADMIN",
    reception = admin || user.role === "RECEPTION",
    diagnosis = admin || user.role === "DIAGNOSIS_DESK",
    tech = user.role === "TECHNICIAN_DESK";
  const menu = [
    ["tickets", tech ? "طاولة العمل" : "لوحة الطلبات"],
    ...(reception
      ? [
          ["intake", "استلام جهاز"],
          ["delivery", "جاهز للتسليم"],
        ]
      : []),
    ...(diagnosis ? [["diagnosis", "مكتب التشخيص"]] : []),
    ["inventory", "قطع الغيار"],
    ...(admin
      ? [
          ["staff", "الفريق والطاولات"],
          ["settings", "إعدادات النظام"],
        ]
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
  return (
    <div className="app-shell" dir="rtl">
      <aside className="app-sidebar">
        <div className="flex items-center gap-3 mb-9">
          <div className="brand-mark">
            <Cpu />
          </div>
          <div>
            <strong className="text-2xl">
              نواة <span className="text-gold">للتقنية</span>
            </strong>
            <p className="text-xs text-slate-400 tracking-widest mt-1">
              WORKSHOP OS
            </p>
          </div>
        </div>
        <nav className="space-y-2">
          {menu.map(([key, label]) => (
            <button
              key={key}
              onClick={() => {
                setTab(key);
                setSelected(null);
                setSearch("");
              }}
              className={`nav-link ${tab === key ? "active" : ""}`}
            >
              {label}
            </button>
          ))}
        </nav>
        <div className="mt-auto pt-8">
          <p className="font-bold">{user.name}</p>
          <p className="text-xs font-mono text-slate-400 my-2">
            {user.role}
            {user.desk_id ? ` · DESK ${user.desk_id}` : ""}
          </p>
          <button
            className="btn btn-muted w-full"
            onClick={() =>
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
              })
            }
          >
            <LogOut size={16} />
            تسجيل الخروج
          </button>
        </div>
      </aside>
      <main className="workspace">
        <header className="flex flex-wrap gap-4 items-center justify-between mb-7">
          <div>
            <p className="text-sm text-slate-400 mb-2">
              {new Intl.DateTimeFormat("ar-SY", {
                dateStyle: "full",
                timeZone: "Asia/Damascus",
              }).format(new Date())}
            </p>
            <h1 className="text-3xl font-black">
              {menu.find((x) => x[0] === tab)?.[1]}
            </h1>
          </div>
          <button
            disabled={busy}
            className="btn btn-muted"
            onClick={() => void run(async () => {})}
          >
            <RefreshCw size={17} />
            تحديث
          </button>
        </header>
        {error && (
          <div role="alert" className="error-box mb-5">
            {error}
          </div>
        )}
        {count > 10 && (
          <div className="warning-box mb-5">
            تحذير ضغط التشخيص: {count} جهازاً بانتظار التشخيص
          </div>
        )}
        <div className="stats-grid mb-7">
          {[
            [
              "الأجهزة النشطة",
              tickets.filter(
                (t) => !["delivered", "cancelled"].includes(t.status),
              ).length,
            ],
            [
              "قيد الإصلاح",
              tickets.filter((t) => t.status === "in_repair").length,
            ],
            [
              "جاهز للتسليم",
              tickets.filter((t) => t.status === "ready_for_delivery").length,
            ],
            [
              "مخزون منخفض",
              parts.filter((p) => p.stock_quantity <= p.minimum_warning_limit)
                .length,
            ],
          ].map(([label, value]) => (
            <div className="glass stat-card" key={label}>
              <p className="text-slate-300">{label}</p>
              <strong className="text-4xl text-gold font-black block mt-4">
                {value}
              </strong>
            </div>
          ))}
        </div>
        {["tickets", "diagnosis", "delivery"].includes(tab) && (
          <>
            <input
              aria-label="بحث الطلبات"
              className="input mb-5"
              placeholder="بحث باسم العميل أو الهاتف أو رقم الطلب…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="ticket-grid">
              {shown.map((t) => (
                <button
                  className="glass ticket-card text-right"
                  key={t.id}
                  onClick={() =>
                    void run(async () => {
                      setSelected(await api<Ticket>(`/tickets/${t.id}`));
                    })
                  }
                >
                  <div className="flex justify-between">
                    <span className={`badge status-${t.status}`}>
                      {labels[t.status]}
                    </span>
                    <span className="font-mono text-sm text-slate-400">
                      #{t.id}
                    </span>
                  </div>
                  <h2 className="text-xl font-extrabold mt-5">
                    {t.brand} {t.model}
                  </h2>
                  <p className="mt-2 text-slate-300">{t.customer_name}</p>
                  <p className="mt-3 text-sm text-slate-400">
                    {t.reported_issue}
                  </p>
                  <div className="flex justify-between mt-5 border-t border-slate-700 pt-4">
                    <strong className="text-gold">
                      {money(Number(t.estimated_cost) + Number(t.parts_cost))}
                    </strong>
                    <Countdown due={t.delivery_due_at} />
                  </div>
                </button>
              ))}
            </div>
            {!shown.length && (
              <div className="glass p-10 text-center">
                لا توجد طلبات في هذه القائمة
              </div>
            )}
          </>
        )}
        {tab === "intake" && reception && (
          <form
            className="glass p-6 space-y-5"
            onSubmit={form(async (v) => {
              setReceipt(await api<Receipt>("/tickets", "POST", v));
              setTab("tickets");
            })}
          >
            <h2 className="text-xl font-bold">بيانات العميل والجهاز</h2>
            <div className="form-grid">
              <Field label="اسم العميل" name="customer_name" required />
              <Field label="رقم الهاتف" name="customer_phone" required />
              <Field label="الشركة" name="brand" required />
              <Field label="الموديل" name="model" required />
              <Field label="Serial / IMEI" name="serial_imei" />
              <Field
                label="رمز قفل الجهاز (اختياري)"
                name="device_passcode"
                type="password"
              />
              <label>
                نوع الإصلاح
                <select name="repair_type" className="input">
                  <option value="standard">إصلاح عادي</option>
                  <option value="instant">إصلاح فوري</option>
                </select>
              </label>
            </div>
            <label>
              العطل المبلغ عنه
              <textarea
                name="reported_issue"
                className="input"
                required
                maxLength={5000}
              />
            </label>
            <button disabled={busy} className="btn btn-gold">
              تسجيل الجهاز وإصدار الإيصال
            </button>
          </form>
        )}
        {tab === "inventory" && (
          <div className="space-y-6">
            {admin && (
              <form
                className="glass p-6 space-y-4"
                onSubmit={form(async (v) => {
                  await api("/inventory", "POST", v);
                })}
              >
                <h2 className="text-xl font-bold">إضافة قطعة غيار</h2>
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
                </div>
                <button disabled={busy} className="btn btn-gold">
                  إضافة
                </button>
              </form>
            )}
            <div className="glass overflow-x-auto">
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
                  {parts.map((p) => (
                    <tr key={p.id}>
                      <td>
                        {p.name}
                        <small className="block font-mono text-slate-400">
                          {p.sku}
                        </small>
                      </td>
                      <td>{p.category}</td>
                      <td
                        className={
                          p.stock_quantity <= p.minimum_warning_limit
                            ? "text-amber-300 font-bold"
                            : ""
                        }
                      >
                        {p.stock_quantity}
                        {p.stock_quantity <= p.minimum_warning_limit
                          ? " · منخفض"
                          : ""}
                      </td>
                      <td>{money(p.unit_cost)}</td>
                      {admin && (
                        <td>
                          <form
                            className="flex gap-2"
                            onSubmit={form(async (v) => {
                              await api(`/inventory/${p.id}`, "PUT", {
                                ...p,
                                stock_quantity: Number(v.qty),
                              });
                            })}
                          >
                            <input
                              aria-label="الكمية"
                              className="input w-24"
                              name="qty"
                              type="number"
                              min="0"
                              defaultValue={p.stock_quantity}
                            />
                            <button disabled={busy} className="btn btn-muted">
                              حفظ
                            </button>
                            <button
                              disabled={busy}
                              type="button"
                              className="btn btn-danger"
                              onClick={() =>
                                void run(async () => {
                                  await api(`/inventory/${p.id}`, "DELETE");
                                })
                              }
                            >
                              أرشفة
                            </button>
                          </form>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {tab === "settings" && admin && settings && (
          <form
            className="glass p-6 space-y-5"
            onSubmit={form(async (v) => {
              setSettings(await api("/settings", "PUT", v));
            })}
          >
            <h2 className="text-xl font-bold">بيانات الورشة</h2>
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
            <button disabled={busy} className="btn btn-gold">
              حفظ الإعدادات
            </button>
          </form>
        )}
        {tab === "staff" && admin && (
          <div className="space-y-6">
            <form
              className="glass p-6 space-y-4"
              onSubmit={form(async (v) => {
                await api("/desks", "POST", v);
              })}
            >
              <h2 className="text-xl font-bold">إضافة طاولة</h2>
              <Field label="اسم الطاولة" name="name" required />
              <button disabled={busy} className="btn btn-gold">
                إضافة
              </button>
            </form>
            <section className="glass p-6 space-y-3">
              <h2 className="text-xl font-bold">طاولات العمل</h2>
              {desks.map((d) => (
                <form
                  className="flex gap-3 items-center"
                  key={d.id}
                  onSubmit={form(async (v) => {
                    await api(`/desks/${d.id}`, "PUT", {
                      name: v.name,
                      active: v.active === "on",
                    });
                  })}
                >
                  <input
                    aria-label="اسم الطاولة"
                    name="name"
                    className="input flex-1"
                    defaultValue={d.name}
                  />
                  <label className="flex gap-2">
                    <input
                      name="active"
                      type="checkbox"
                      defaultChecked={d.active}
                    />
                    نشطة
                  </label>
                  <button disabled={busy} className="btn btn-muted">
                    حفظ
                  </button>
                </form>
              ))}
            </section>
            <form
              className="glass p-6 space-y-4"
              onSubmit={form(async (v) => {
                await api("/users", "POST", {
                  ...v,
                  desk_id: v.desk_id ? Number(v.desk_id) : null,
                });
              })}
            >
              <h2 className="text-xl font-bold">إضافة موظف</h2>
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
                <label>
                  الدور
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
                <label>
                  الطاولة
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
              <button disabled={busy} className="btn btn-gold">
                إضافة الموظف
              </button>
            </form>
            {[
              ["الفريق الحالي", staff],
              ["أرشيف الموظفين", former],
            ].map(([title, list]) => (
              <section className="glass p-6" key={String(title)}>
                <h2 className="text-xl font-bold mb-4">{String(title)}</h2>
                {(list as User[]).map((s) => (
                  <div
                    className="flex justify-between border-t border-slate-700 py-4"
                    key={s.id}
                  >
                    <div>
                      {s.name}
                      <p className="font-mono text-sm text-slate-400">
                        #{s.id} · {s.role} · {s.email}
                      </p>
                    </div>
                    {s.id !== user.id && (
                      <button
                        disabled={busy}
                        className="btn btn-muted"
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
                ))}
              </section>
            ))}
          </div>
        )}
      </main>
      {selected && (
        <div className="modal-backdrop">
          <section className="modal p-6 space-y-5">
            {error && (
              <div role="alert" className="error-box">
                {error}
              </div>
            )}
            <div className="flex justify-between">
              <h2 className="text-2xl font-bold">
                {selected.brand} {selected.model}{" "}
                <span className="text-gold">#{selected.id}</span>
              </h2>
              <button
                aria-label="إغلاق"
                className="btn btn-muted"
                onClick={() => setSelected(null)}
              >
                ×
              </button>
            </div>
            <span className={`badge status-${selected.status}`}>
              {labels[selected.status]}
            </span>
            <p>
              {selected.customer_name} ·{" "}
              <span dir="ltr">{selected.customer_phone}</span>
            </p>
            <p>{selected.reported_issue}</p>
            {selected.device_passcode && (
              <p>
                رمز الجهاز: <code>{selected.device_passcode}</code>
              </p>
            )}
            <p>
              التكلفة:{" "}
              <b className="text-gold">
                {money(
                  Number(selected.estimated_cost) + Number(selected.parts_cost),
                )}
              </b>
            </p>
            {selected.diagnosis && <p>التشخيص: {selected.diagnosis}</p>}
            {diagnosis &&
              ["pending_diagnosis", "awaiting_customer_approval"].includes(
                selected.status,
              ) && (
                <form
                  className="space-y-4"
                  onSubmit={form(async (v) =>
                    update({
                      ...v,
                      estimated_cost: Number(v.estimated_cost),
                      status: "awaiting_customer_approval",
                    }),
                  )}
                >
                  <label>
                    نتيجة التشخيص
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
                  <button disabled={busy} className="btn btn-gold">
                    حفظ وإرسال لانتظار الموافقة
                  </button>
                </form>
              )}
            {reception && selected.status === "awaiting_customer_approval" && (
              <div className="space-y-4">
                <button
                  disabled={busy || !!selected.approved_at}
                  className="btn btn-gold"
                  onClick={() =>
                    void run(async () => update({ approved: true }))
                  }
                >
                  {selected.approved_at
                    ? "تم تسجيل موافقة العميل"
                    : "تأكيد موافقة العميل"}
                </button>
                {selected.approved_at && (
                  <form
                    className="space-y-3"
                    onSubmit={form(async (v) => {
                      await api(`/tickets/${selected.id}/route-desk`, "PUT", {
                        desk_id: Number(v.desk_id),
                        technician_id: Number(v.technician_id),
                      });
                      setSelected(await api<Ticket>(`/tickets/${selected.id}`));
                    })}
                  >
                    <label>
                      الطاولة
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
                    <label>
                      الفني المسؤول
                      <select className="input" name="technician_id" required>
                        {technicians.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name} ·{" "}
                            {desks.find((d) => d.id === t.desk_id)?.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button disabled={busy} className="btn btn-gold">
                      تحويل إلى الطاولة
                    </button>
                  </form>
                )}
              </div>
            )}
            {(tech || admin) && selected.status === "assigned_to_desk" && (
              <form
                className="space-y-3"
                onSubmit={form(async (v) => {
                  await api(`/tickets/${selected.id}/verify-code`, "POST", v);
                  setSelected(await api<Ticket>(`/tickets/${selected.id}`));
                })}
              >
                <Field
                  label="رمز أمان الطاولة من الإيصال B"
                  name="code"
                  required
                />
                <button disabled={busy} className="btn btn-gold">
                  تحقق وابدأ الإصلاح
                </button>
              </form>
            )}
            {(tech || admin) &&
              selected.status === "in_repair" &&
              selected.unlocked_at && (
                <form
                  className="space-y-3"
                  onSubmit={form(async (v) =>
                    update({
                      notes: v.notes,
                      ...(v.delivery_minutes
                        ? { delivery_minutes: Number(v.delivery_minutes) }
                        : {}),
                    }),
                  )}
                >
                  <Field
                    label="المدة المتبقية بالدقائق"
                    name="delivery_minutes"
                    type="number"
                  />
                  <label>
                    ملاحظات الإصلاح
                    <textarea
                      className="input"
                      name="notes"
                      defaultValue={selected.notes || ""}
                    />
                  </label>
                  <div className="flex gap-3">
                    <button disabled={busy} className="btn btn-muted">
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
                      جاهز للتسليم
                    </button>
                  </div>
                </form>
              )}
            {((diagnosis &&
              ["pending_diagnosis", "awaiting_customer_approval"].includes(
                selected.status,
              )) ||
              ((tech || admin) &&
                selected.status === "in_repair" &&
                selected.unlocked_at)) && (
              <form
                className="space-y-3 border-t border-slate-700 pt-4"
                onSubmit={form(async (v) => {
                  await api(`/tickets/${selected.id}/consume-parts`, "POST", {
                    parts: [
                      {
                        inventory_item_id: Number(v.part),
                        quantity: Number(v.quantity),
                      },
                    ],
                  });
                  setSelected(await api<Ticket>(`/tickets/${selected.id}`));
                })}
              >
                <label>
                  صرف قطعة غيار
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
                <button disabled={busy} className="btn btn-muted">
                  صرف من المخزون
                </button>
              </form>
            )}
            {selected.status === "ready_for_delivery" && (
              <div className="flex flex-wrap gap-3">
                <a
                  className="btn btn-muted"
                  target="_blank"
                  rel="noopener noreferrer"
                  href={`https://wa.me/${selected.customer_phone.replace(/\D/g, "")}?text=${encodeURIComponent(`مرحباً ${selected.customer_name}، جهازك ${selected.brand} ${selected.model} جاهز للاستلام. رقم الطلب ${selected.reference}`)}`}
                >
                  إشعار واتساب
                </a>
                {reception && (
                  <button
                    disabled={busy}
                    className="btn btn-gold"
                    onClick={() =>
                      void run(async () => {
                        await api(`/tickets/${selected.id}/checkout`, "PUT");
                        setSelected(null);
                      })
                    }
                  >
                    تأكيد التسليم
                  </button>
                )}
              </div>
            )}
            {admin && !["delivered", "cancelled"].includes(selected.status) && (
              <button
                disabled={busy}
                className="btn btn-danger"
                onClick={() =>
                  void run(async () => update({ status: "cancelled" }))
                }
              >
                إلغاء الطلب
              </button>
            )}
          </section>
        </div>
      )}
      {receipt && (
        <div className="modal-backdrop">
          <section className="modal p-6">
            <div className="receipt-grid print-receipt">
              {["A", "B"].map((part) => (
                <article key={part} className="receipt-paper">
                  <h2 className="text-2xl font-black">نواة للصيانة</h2>
                  <p className="my-3">
                    {part === "A" ? "نسخة العميل · A" : "نسخة طاولة العمل · B"}
                  </p>
                  <p className="font-mono text-sm break-all">
                    {receipt.ticket.reference}
                  </p>
                  <h3 className="font-bold my-4">
                    {receipt.ticket.brand} {receipt.ticket.model}
                  </h3>
                  <p>{receipt.ticket.customer_name}</p>
                  <p className="my-3">{receipt.ticket.reported_issue}</p>
                  {part === "A" ? (
                    <>
                      <QRCodeSVG
                        value={receipt.part_a.tracking_url}
                        size={130}
                      />
                      <p className="text-sm mt-3">امسح لمتابعة حالة الإصلاح</p>
                    </>
                  ) : (
                    <>
                      <p>رمز أمان الطاولة</p>
                      <strong className="text-4xl font-mono tracking-widest block mt-4">
                        {receipt.part_b.security_code}
                      </strong>
                      <p className="text-sm mt-3">
                        احتفظ بهذه النسخة؛ لا يمكن استرجاع الرمز.
                      </p>
                    </>
                  )}
                </article>
              ))}
            </div>
            <div className="flex gap-3 mt-5">
              <button className="btn btn-gold" onClick={() => window.print()}>
                <Printer size={17} />
                طباعة النسختين
              </button>
              <button
                className="btn btn-muted"
                onClick={() => setReceipt(null)}
              >
                إغلاق
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
function Field({
  label,
  ...props
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  defaultValue?: string;
}) {
  return (
    <label>
      {label}
      <input
        className="input"
        min={props.type === "number" ? 0 : undefined}
        step={props.type === "number" ? "any" : undefined}
        {...props}
      />
    </label>
  );
}
function Countdown({ due }: { due: string | null }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  if (!due)
    return <span className="text-sm text-slate-400">لم يحدد الموعد</span>;
  const s = Math.max(0, Math.floor((Date.parse(due) - now) / 1000));
  return (
    <span className="font-mono" dir="ltr">
      {Math.floor(s / 3600)}:
      {String(Math.floor((s % 3600) / 60)).padStart(2, "0")}:
      {String(s % 60).padStart(2, "0")}
    </span>
  );
}
