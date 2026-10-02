import { useMemo, useState } from "react";
import { Send } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  useTable, useTransactions, useInvalidate, baht, num, monthKey, monthLabel, txnTotal, baseQty, shareText,
  type Branch, type Product, type ProductUnit, type StockCount, type Txn,
} from "@/lib/db";
import { Card } from "./ConfirmDelete";

export function ReconcileTab() {
  const { data: branches = [] } = useTable<Branch>("branches");
  const { data: products = [] } = useTable<Product>("products");
  const { data: units = [] } = useTable<ProductUnit>("product_units");
  const { data: txns = [] } = useTransactions();
  const months = useMemo(() => {
    const s = new Set(txns.map((t) => monthKey(t.created_at)));
    s.add(monthKey(new Date().toISOString()));
    return Array.from(s).sort().reverse();
  }, [txns]);
  const [month, setMonth] = useState("");
  const [view, setView] = useState<"main" | "sub">("sub");
  const cur = month || months[0] || "";

  const perProduct = (ts: Txn[], kind: string) => {
    const m = new Map<string, number>();
    ts.filter((t) => t.kind === kind).forEach((t) => t.transaction_items.forEach((i) => {
      if (!i.product_id) return;
      const p = products.find((x) => x.id === i.product_id);
      m.set(i.product_id, (m.get(i.product_id) ?? 0) + baseQty(p, units, i.unit_name, Number(i.qty)));
    }));
    return m;
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {([["sub", "สาขาย่อย"], ["main", "สาขาหลัก"]] as const).map(([k, l]) => (
          <button key={k} onClick={() => setView(k)} className={`flex-1 rounded-full border py-2 text-sm font-medium ${view === k ? "ig-gradient border-transparent text-on-gradient" : "hover:bg-muted"}`}>{l}</button>
        ))}
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {months.map((m) => (
          <button key={m} onClick={() => setMonth(m)} className={`shrink-0 rounded-full border px-4 py-1.5 text-sm ${m === cur ? "bg-foreground text-background" : "hover:bg-muted"}`}>{monthLabel(m)}</button>
        ))}
      </div>

      {view === "main" ? <MainView month={cur} products={products} units={units} txns={txns} perProduct={perProduct} /> : (
        <>
          <p className="px-1 text-sm text-muted-foreground">ยอดโอนไป (ราคาเต็ม) − บิลขายส่งหน้าร้านสาขา = ยอดเรียกเก็บสิ้นเดือน</p>
          {branches.map((b) => {
            const all = txns.filter((t) => t.branch_id === b.id);
            const mon = all.filter((t) => monthKey(t.created_at) === cur);
            const sent = mon.filter((t) => t.kind === "branch").reduce((s, t) => s + txnTotal(t), 0);
            const sold = mon.filter((t) => t.kind === "branch_sale").reduce((s, t) => s + txnTotal(t), 0);
            const inM = perProduct(mon, "branch"), outM = perProduct(mon, "branch_sale");
            const inAll = perProduct(all, "branch"), outAll = perProduct(all, "branch_sale");
            const ids = Array.from(new Set([...inAll.keys(), ...outAll.keys()]));
            if (!ids.length) return null;
            const share = () => {
              const lines = [`OBWangnoi OG — กระทบยอด สาขา ${b.name}`, monthLabel(cur), "",
                `ยอดโอนไป (ราคาเต็ม): ${baht(sent)}`, `ขายส่งหน้าร้านสาขา: ${baht(sold)}`, `ยอดเรียกเก็บสุทธิ: ${baht(sent - sold)}`, "", "สินค้า (โอน / ขายส่ง / คงเหลือ):"];
              ids.forEach((id) => {
                const p = products.find((x) => x.id === id);
                lines.push(`• ${p?.name ?? "-"}: ${num(inM.get(id) ?? 0)} / ${num(outM.get(id) ?? 0)} / ${num((inAll.get(id) ?? 0) - (outAll.get(id) ?? 0))} ${p?.unit ?? ""}`);
              });
              shareText(lines.join("\n"));
            };
            return (
              <Card key={b.id}>
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-lg">สาขา {b.name}</h3>
                  <Button size="sm" variant="secondary" onClick={share}><Send className="h-4 w-4" />แชร์ LINE</Button>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2 text-center text-sm">
                  <div className="rounded-xl bg-muted/50 p-2"><p className="text-xs text-muted-foreground">โอนไป (ราคาเต็ม)</p><p className="font-semibold">{baht(sent)}</p></div>
                  <div className="rounded-xl bg-muted/50 p-2"><p className="text-xs text-muted-foreground">ขายส่งหน้าร้าน</p><p className="font-semibold">{baht(sold)}</p></div>
                  <div className="rounded-xl bg-muted/50 p-2"><p className="text-xs text-muted-foreground">เรียกเก็บสุทธิ</p><p className={`font-semibold ${sent - sold < 0 ? "text-destructive" : ""}`}>{baht(sent - sold)}</p></div>
                </div>
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-xs text-muted-foreground"><tr><th className="py-1 text-left">สินค้า</th><th className="text-right">โอน (เดือน)</th><th className="text-right">ขายส่ง (เดือน)</th><th className="text-right">คงเหลือสาขา</th></tr></thead>
                    <tbody>
                      {ids.map((id) => {
                        const p = products.find((x) => x.id === id);
                        const left = (inAll.get(id) ?? 0) - (outAll.get(id) ?? 0);
                        return (
                          <tr key={id} className="border-t">
                            <td className="py-1">{p?.name ?? "-"} <span className="text-xs text-muted-foreground">({p?.unit})</span></td>
                            <td className="text-right">{num(inM.get(id) ?? 0)}</td>
                            <td className="text-right">{num(outM.get(id) ?? 0)}</td>
                            <td className={`text-right font-medium ${left < 0 ? "text-destructive" : ""}`}>{num(left)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            );
          })}
        </>
      )}
    </div>
  );
}

const endOfMonth = (k: string) => {
  const [y = 2000, m = 1] = k.split("-").map(Number);
  return new Date(y, m, 1).getTime();
};

function MainView({ month, products, units, txns, perProduct }: {
  month: string; products: Product[]; units: ProductUnit[]; txns: Txn[]; perProduct: (ts: Txn[], kind: string) => Map<string, number>;
}) {
  const { data: counts = [] } = useTable<StockCount>("stock_counts");
  const inv = useInvalidate();
  const [draft, setDraft] = useState<Record<string, string>>({});
  const mon = txns.filter((t) => monthKey(t.created_at) === month);
  const sentM = perProduct(mon, "branch"), mainM = perProduct(mon, "main_sale");
  const mainSales = mon.filter((t) => t.kind === "main_sale").reduce((s, t) => s + txnTotal(t), 0);

  // สต็อกระบบ ณ สิ้นเดือน = สต็อกปัจจุบัน + รายการที่ตัดสต็อกหลังสิ้นเดือน
  const end = endOfMonth(month);
  const after = new Map<string, number>();
  txns.filter((t) => t.deduct_stock && new Date(t.created_at).getTime() >= end).forEach((t) => t.transaction_items.forEach((i) => {
    if (!i.product_id) return;
    const p = products.find((x) => x.id === i.product_id);
    after.set(i.product_id, (after.get(i.product_id) ?? 0) + baseQty(p, units, i.unit_name, Number(i.qty)));
  }));

  const rows = products.map((p) => {
    const c = counts.find((x) => x.product_id === p.id && x.month === month);
    const expected = c ? Number(c.expected) : Number(p.stock) + (after.get(p.id) ?? 0);
    const retail = c ? Math.max(0, expected - Number(c.actual)) : 0;
    return { p, c, expected, retail, value: retail * Number(p.price) };
  });
  const retailTotal = rows.reduce((s, r) => s + r.value, 0);

  const save = async (r: (typeof rows)[number]) => {
    const v = draft[r.p.id];
    const actual = Number(v);
    if (v === undefined || v === "" || isNaN(actual)) return void toast.error("กรอกน้ำหนักคงเหลือจริง");
    const delta = actual - (r.c ? Number(r.c.actual) : r.expected);
    const { error } = await supabase.from("stock_counts").upsert({ month, product_id: r.p.id, expected: r.expected, actual }, { onConflict: "month,product_id" });
    if (error) return void toast.error(error.message);
    await supabase.from("products").update({ stock: Number(r.p.stock) + delta }).eq("id", r.p.id);
    setDraft({ ...draft, [r.p.id]: "" });
    inv("stock_counts", "products");
    toast.success(`บันทึกคงเหลือจริง ${r.p.name}`);
  };

  const share = () => {
    const lines = [`OBWangnoi OG — กระทบยอด สาขาหลัก`, monthLabel(month), "",
      `ขายปลีก (คำนวณจากน้ำหนัก): ${baht(retailTotal)}`, `บิลขายส่งสาขาหลัก: ${baht(mainSales)}`, `ยอดเงินรวม: ${baht(retailTotal + mainSales)}`, ""];
    rows.filter((r) => r.c).forEach((r) => lines.push(`• ${r.p.name}: ขายปลีก ${num(r.retail)} ${r.p.unit} = ${baht(r.value)}`));
    shareText(lines.join("\n"));
  };

  return (
    <div className="space-y-4">
      <p className="px-1 text-sm text-muted-foreground">น้ำหนักขายปลีก = (สต็อกตั้งต้น + นำเข้า) − โอนไปสาขา − ขายส่งสาขาหลัก − คงเหลือจริงที่ชั่งได้ · คูณราคาขายปลีก</p>
      <Card>
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg">สาขาหลัก</h3>
          <Button size="sm" variant="secondary" onClick={share}><Send className="h-4 w-4" />แชร์ LINE</Button>
        </div>
        <div className="mt-2 grid grid-cols-3 gap-2 text-center text-sm">
          <div className="rounded-xl bg-muted/50 p-2"><p className="text-xs text-muted-foreground">ขายปลีก (คำนวณ)</p><p className="font-semibold">{baht(retailTotal)}</p></div>
          <div className="rounded-xl bg-muted/50 p-2"><p className="text-xs text-muted-foreground">บิลขายส่ง</p><p className="font-semibold">{baht(mainSales)}</p></div>
          <div className="rounded-xl bg-muted/50 p-2"><p className="text-xs text-muted-foreground">ยอดเงินรวม</p><p className="font-semibold">{baht(retailTotal + mainSales)}</p></div>
        </div>
      </Card>
      {rows.map((r) => (
        <Card key={r.p.id}>
          <div className="flex items-baseline justify-between gap-2">
            <p className="font-semibold">{r.p.name} <span className="text-xs text-muted-foreground">({r.p.unit} · ปลีก {baht(Number(r.p.price))})</span></p>
            {r.c && <span className="text-sm font-semibold">{baht(r.value)}</span>}
          </div>
          <div className="mt-2 grid grid-cols-2 gap-1 text-xs text-muted-foreground sm:grid-cols-4">
            <span>โอนไปสาขา: {num(sentM.get(r.p.id) ?? 0)}</span>
            <span>ขายส่งหลัก: {num(mainM.get(r.p.id) ?? 0)}</span>
            <span>คงเหลือในระบบ: <b className="text-foreground">{num(r.expected)}</b></span>
            <span>คงเหลือจริง: <b className="text-foreground">{r.c ? num(Number(r.c.actual)) : "-"}</b></span>
          </div>
          {r.c && <p className="mt-1 text-xs">ขายปลีกได้ {num(r.retail)} {r.p.unit} × {baht(Number(r.p.price))} = <b>{baht(r.value)}</b></p>}
          <div data-edit className="mt-2 flex gap-2">
            <Input className="h-9" type="number" placeholder={`คงเหลือจริงที่ชั่งได้ (${r.p.unit})`} value={draft[r.p.id] ?? ""} onChange={(e) => setDraft({ ...draft, [r.p.id]: e.target.value })} />
            <Button size="sm" variant="outline" onClick={() => save(r)}>บันทึก</Button>
          </div>
        </Card>
      ))}
      <p className="px-1 text-xs text-muted-foreground">บันทึกคงเหลือจริงแล้ว สต็อกในระบบจะถูกปรับเป็นยอดจริงอัตโนมัติ เพื่อเริ่มเดือนถัดไปได้ถูกต้อง</p>
    </div>
  );
}
