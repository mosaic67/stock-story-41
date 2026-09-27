import { useMemo, useState } from "react";
import { Plus, Send, Store, User, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  useTable, useTransactions, useInvalidate, baht, num, fmtDateTime, fmtDate, monthKey, dayKey, monthLabel, txnTotal, shareToLine,
  type Product, type ProductUnit, type Branch, type Customer, type CustomerPrice, type Txn,
} from "@/lib/db";
import { ConfirmDelete, Card } from "./ConfirmDelete";

type Line = { product_id: string; product_name: string; unit_name: string; qty: number; price: number; price_type: string; note: string };

const sel = "h-9 w-full rounded-md border bg-background px-3 text-sm";

export function usePartyName() {
  const { data: branches = [] } = useTable<Branch>("branches");
  const { data: customers = [] } = useTable<Customer>("customers");
  return (t: Txn) =>
    t.kind === "branch"
      ? "สาขา " + (branches.find((b) => b.id === t.branch_id)?.name ?? "-")
      : "ลูกค้า " + (customers.find((c) => c.id === t.customer_id)?.name ?? "-");
}

export function TxnCard({ t }: { t: Txn }) {
  const inv = useInvalidate();
  const party = usePartyName();
  return (
    <Card>
      <div className="flex items-start gap-3">
        <div className="ig-ring shrink-0"><div className="flex h-10 w-10 items-center justify-center rounded-full bg-card">{t.kind === "branch" ? <Store className="h-4 w-4" /> : <User className="h-4 w-4" />}</div></div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{party(t)}</p>
          <p className="text-xs text-muted-foreground">{fmtDateTime(t.created_at)}</p>
        </div>
        <button className="rounded-full p-2 text-muted-foreground hover:bg-muted" aria-label="แชร์ไลน์" onClick={() => shareToLine("OBWangnoi OG — บิล", [t], party)}><Send className="h-4 w-4" /></button>
        <ConfirmDelete label={`บิล ${fmtDateTime(t.created_at)}`} onConfirm={async () => { await supabase.from("transactions").delete().eq("id", t.id); inv("transactions", "products"); toast.success("ลบบิลแล้ว"); }} />
      </div>
      <div className="mt-3 space-y-1 text-sm">
        {t.transaction_items.map((i) => (
          <div key={i.id} className="flex justify-between gap-2">
            <span>{i.product_name} <span className="text-muted-foreground">× {num(Number(i.qty))} {i.unit_name} @ {baht(Number(i.price))}</span>{i.note && <span className="text-xs text-muted-foreground"> ({i.note})</span>}</span>
            <span className="shrink-0">{baht(Number(i.qty) * Number(i.price))}</span>
          </div>
        ))}
      </div>
      {t.note && <p className="mt-2 text-xs text-muted-foreground">หมายเหตุ: {t.note}</p>}
      <div className="mt-2 flex justify-between border-t pt-2 font-semibold"><span>รวม</span><span>{baht(txnTotal(t))}</span></div>
    </Card>
  );
}

export function RecordsTab() {
  const { data: products = [] } = useTable<Product>("products");
  const { data: units = [] } = useTable<ProductUnit>("product_units");
  const { data: branches = [] } = useTable<Branch>("branches");
  const { data: customers = [] } = useTable<Customer>("customers");
  const { data: cprices = [] } = useTable<CustomerPrice>("customer_prices", "");
  const { data: txns = [] } = useTransactions();
  const inv = useInvalidate();

  const [kind, setKind] = useState<"branch" | "customer">("branch");
  const [partyId, setPartyId] = useState("");
  const [note, setNote] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const [pick, setPick] = useState({ product_id: "", unit_name: "", price_type: "retail", qty: "1", price: "", note: "" });

  const unitOpts = (pid: string) => {
    const p = products.find((x) => x.id === pid);
    if (!p) return [];
    return [{ unit_name: p.unit, retail: Number(p.price), wholesale: Number(p.price) },
      ...units.filter((u) => u.product_id === pid).map((u) => ({ unit_name: u.unit_name, retail: Number(u.retail_price), wholesale: Number(u.wholesale_price) }))];
  };
  const priceFor = (pid: string, unit: string, type: string) => {
    const u = unitOpts(pid).find((x) => x.unit_name === unit);
    if (!u) return 0;
    if (type === "special") return Number(cprices.find((c) => c.customer_id === partyId && c.product_id === pid && c.unit_name === unit)?.price ?? u.retail);
    return type === "wholesale" ? u.wholesale : u.retail;
  };
  const update = (patch: Partial<typeof pick>) => {
    const n = { ...pick, ...patch };
    if (patch.product_id) n.unit_name = unitOpts(patch.product_id)[0]?.unit_name ?? "";
    if (patch.price_type === "special" || (n.price_type === "special" && !patch.price_type)) {
      // ราคาพิเศษ: ไม่คำนวณอัตโนมัติ ให้กรอกปริมาณและยอดราคาเอง
      if (patch.price_type === "special") n.price = "";
    } else if (patch.product_id || patch.unit_name || patch.price_type) {
      n.price = String(priceFor(n.product_id, n.unit_name, n.price_type));
    }
    setPick(n);
  };

  const addLine = () => {
    const p = products.find((x) => x.id === pick.product_id);
    if (!p) return void toast.error("เลือกสินค้า");
    setLines([...lines, { product_id: p.id, product_name: p.name, unit_name: pick.unit_name, qty: Number(pick.qty) || 1, price: Number(pick.price) || 0, price_type: pick.price_type, note: pick.note }]);
    setPick({ ...pick, qty: "1", note: "" });
  };

  const saveBill = async () => {
    if (!partyId) return void toast.error(kind === "branch" ? "เลือกสาขา" : "เลือกลูกค้า");
    if (!lines.length) return void toast.error("เพิ่มรายการสินค้าก่อน");
    const { data, error } = await supabase.from("transactions").insert({
      kind, note: note || null, branch_id: kind === "branch" ? partyId : null, customer_id: kind === "customer" ? partyId : null,
    }).select().single();
    if (error || !data) return void toast.error(error?.message ?? "ผิดพลาด");
    const { error: e2 } = await supabase.from("transaction_items").insert(lines.map((l) => ({ ...l, note: l.note || null, transaction_id: data.id })));
    if (e2) return void toast.error(e2.message);
    toast.success("บันทึกบิลแล้ว");
    setLines([]); setNote("");
    inv("transactions", "products");
  };

  const months = useMemo(() => Array.from(new Set(txns.map((t) => monthKey(t.created_at)))), [txns]);
  const [month, setMonth] = useState("");
  const curMonth = month || months[0] || "";
  const monthTx = txns.filter((t) => monthKey(t.created_at) === curMonth);
  const days = useMemo(() => {
    const m = new Map<string, Txn[]>();
    monthTx.forEach((t) => m.set(dayKey(t.created_at), [...(m.get(dayKey(t.created_at)) ?? []), t]));
    return Array.from(m.entries());
  }, [monthTx]);
  const qtySummary = useMemo(() => {
    const m = new Map<string, { qty: number; amt: number }>();
    monthTx.forEach((t) => t.transaction_items.forEach((i) => {
      const k = `${i.product_name} (${i.unit_name})`;
      const v = m.get(k) ?? { qty: 0, amt: 0 };
      m.set(k, { qty: v.qty + Number(i.qty), amt: v.amt + Number(i.qty) * Number(i.price) });
    }));
    return Array.from(m.entries()).sort((a, b) => b[1].amt - a[1].amt);
  }, [monthTx]);
  const opts = unitOpts(pick.product_id);
  const hasSpecial = kind === "customer";

  return (
    <div className="space-y-4">
      <Card>
        <h2 className="mb-3 font-display text-lg">บันทึกบิลใหม่</h2>
        <div className="mb-3 flex gap-2">
          {(["branch", "customer"] as const).map((k) => (
            <button key={k} onClick={() => { setKind(k); setPartyId(""); if (k === "branch" && pick.price_type === "special") update({ price_type: "retail" }); }}
              className={`flex-1 rounded-full border py-2 text-sm font-medium transition ${kind === k ? "ig-gradient border-transparent text-primary-foreground" : "hover:bg-muted"}`}>
              {k === "branch" ? "โอนไปสาขา" : "ขายลูกค้าพิเศษ"}
            </button>
          ))}
        </div>
        <select className={sel} value={partyId} onChange={(e) => { setPartyId(e.target.value); }}>
          <option value="">— {kind === "branch" ? "เลือกสาขา" : "เลือกลูกค้า"} —</option>
          {(kind === "branch" ? branches : customers).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
        </select>

        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-6">
          <select className={`${sel} col-span-2`} value={pick.product_id} onChange={(e) => update({ product_id: e.target.value })}>
            <option value="">— สินค้า —</option>
            {products.map((p) => <option key={p.id} value={p.id}>{p.code} · {p.name}</option>)}
          </select>
          <select className={sel} value={pick.unit_name} onChange={(e) => update({ unit_name: e.target.value })}>
            {opts.map((o) => <option key={o.unit_name}>{o.unit_name}</option>)}
          </select>
          <select className={sel} value={pick.price_type} onChange={(e) => update({ price_type: e.target.value })}>
            <option value="retail">ราคาปลีก</option>
            <option value="wholesale">ราคาส่ง</option>
            {hasSpecial && <option value="special">ราคาพิเศษ</option>}
          </select>
          <Input type="number" placeholder="จำนวน" value={pick.qty} onChange={(e) => setPick({ ...pick, qty: e.target.value })} />
          <Input type="number" placeholder={pick.price_type === "special" ? "ยอดรวม (บาท)" : "ราคา"} value={pick.price} onChange={(e) => setPick({ ...pick, price: e.target.value })} />
          <Input className="col-span-2 sm:col-span-5" placeholder="หมายเหตุรายการ (ถ้ามี)" value={pick.note} onChange={(e) => setPick({ ...pick, note: e.target.value })} />
          <Button variant="secondary" onClick={addLine}><Plus className="h-4 w-4" />เพิ่ม</Button>
        </div>

        {lines.length > 0 && (
          <div className="mt-3 space-y-1 rounded-xl bg-muted/50 p-3 text-sm">
            {lines.map((l, i) => (
              <div key={i} className="flex items-center justify-between gap-2">
                <span>{l.product_name} × {num(l.qty)} {l.unit_name} @ {baht(l.price)}{l.note && <span className="text-muted-foreground"> ({l.note})</span>}</span>
                <span className="flex items-center gap-1">{baht(l.qty * l.price)}<button onClick={() => setLines(lines.filter((_, j) => j !== i))}><X className="h-4 w-4 text-muted-foreground" /></button></span>
              </div>
            ))}
            <div className="flex justify-between border-t pt-1 font-semibold"><span>รวม</span><span>{baht(lines.reduce((s, l) => s + l.qty * l.price, 0))}</span></div>
          </div>
        )}
        <Input className="mt-3" placeholder="หมายเหตุบิล" value={note} onChange={(e) => setNote(e.target.value)} />
        <Button className="ig-gradient mt-3 w-full border-0 text-primary-foreground" onClick={saveBill}>บันทึกบิล</Button>
      </Card>

      {months.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {months.map((m) => (
            <button key={m} onClick={() => setMonth(m)} className={`shrink-0 rounded-full border px-4 py-1.5 text-sm ${m === curMonth ? "bg-foreground text-background" : "hover:bg-muted"}`}>{monthLabel(m)}</button>
          ))}
        </div>
      )}

      {curMonth && (
        <Card>
          <div className="flex items-baseline justify-between">
            <h3 className="font-display text-lg">สรุป {monthLabel(curMonth)}</h3>
            <span className="text-xl font-bold ig-text">{baht(monthTx.reduce((s, t) => s + txnTotal(t), 0))}</span>
          </div>
          <p className="text-xs text-muted-foreground">{monthTx.length} บิล</p>
          <div className="mt-3 space-y-1 text-sm">
            {qtySummary.map(([k, v]) => (
              <div key={k} className="flex justify-between"><span>{k}</span><span className="text-muted-foreground">{num(v.qty)} · <span className="text-foreground">{baht(v.amt)}</span></span></div>
            ))}
          </div>
        </Card>
      )}

      {days.map(([d, list]) => (
        <div key={d} className="space-y-2">
          <div className="flex items-center justify-between px-1 text-sm">
            <span className="font-semibold">{fmtDate(list[0]!.created_at)}</span>
            <span className="text-muted-foreground">รวมวัน {baht(list.reduce((s, t) => s + txnTotal(t), 0))}</span>
          </div>
          {list.map((t) => <TxnCard key={t.id} t={t} />)}
        </div>
      ))}
      {txns.length === 0 && <p className="py-10 text-center text-muted-foreground">ยังไม่มีรายการ</p>}
    </div>
  );
}
