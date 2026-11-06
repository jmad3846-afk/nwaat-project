"use client";
import { use, useEffect, useState } from "react";
import { api, labels, money } from "../../../lib/api";
type Tracking = {
  reference: string;
  brand: string;
  model: string;
  status: string;
  cost: string;
  remaining_seconds: number | null;
};
export default function TrackingPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token: trackingToken } = use(params);
  const [data, setData] = useState<Tracking | null>(null),
    [error, setError] = useState("");
  useEffect(() => {
    let live = true;
    const load = () =>
      api<Tracking>(
        `/public/track/${encodeURIComponent(trackingToken)}`,
        "GET",
        undefined,
        true,
      )
        .then((d) => {
          if (live) {
            setData(d);
            setError("");
          }
        })
        .catch((e) => {
          if (live) setError(e.message);
        });
    load();
    const timer = setInterval(load, 15000);
    return () => {
      live = false;
      clearInterval(timer);
    };
  }, [trackingToken]);
  return (
    <main className="auth-screen" dir="rtl">
      <section className="glass auth-card space-y-6">
        <h1 className="text-3xl font-black text-gold">نواة للصيانة</h1>
        <h2 className="text-xl font-bold">تتبع حالة الجهاز</h2>
        {error && (
          <p role="alert" className="error-box">
            {error}
          </p>
        )}
        {data ? (
          <>
            <h3 className="text-2xl font-bold">
              {data.brand} {data.model}
            </h3>
            <span className={`badge status-${data.status}`}>
              {labels[data.status]}
            </span>
            <p>
              التكلفة التقديرية: <b className="text-gold">{money(data.cost)}</b>
            </p>
            <p>
              الوقت المتبقي:{" "}
              {data.remaining_seconds === null
                ? "لم يحدد بعد"
                : `${Math.ceil(data.remaining_seconds / 60)} دقيقة`}
            </p>
            <p className="font-mono text-xs break-all text-slate-400">
              {data.reference}
            </p>
            <p className="text-sm text-slate-400">
              يتم التحديث تلقائياً كل 15 ثانية
            </p>
          </>
        ) : (
          !error && <p>جاري التحميل…</p>
        )}
      </section>
    </main>
  );
}
