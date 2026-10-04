import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Camera, ClipboardCheck, History } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useTable, useTransactions, useInvalidate, baht, num, monthKey, monthLabel, txnTotal, baseQty, fmtDateTime, type Branch, type Product, type ProductUnit, type Txn } from "@/lib/db";
import { Card } from "./ConfirmDelete";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { ReconcileShotDialog, type ShotRow } from "./ReconcileShotDialog";

type Closing = Tables<"stock_closings">;

export function ReconcileTab() {
  const { data: branches = [] } = useTable<Branch>("branches");
  const { data: products = [] } = useTable<Product>("products");
  const { data: units = [] } = useTable<ProductUnit>("product_units");
  const { data: txns = [] } = useTransactions();
  const { data: closings = [] } = useQuery({
    queryKey: ["stock_closings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("stock_closings").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Closing[];
    },
  });
  const inv = useInvalidate();
  const months = useMemo(() => Array.from(new Set(txns.map((t) => monthKey(t.created_at)))), [txns]);
  const [month, setMonth] = useState("");
  const cur = month || months[0] || "";
  const [shot, setShot] = useState<{ branch: string; sent: number; sold: number; rows: ShotRow[] } | null>(null);
  const [counting, setCounting] = useState<string | null>(null);
  const [counts, setCounts] = useState<Record<string, string>>({});
  const [histOpen, setHistOpen] = useState<string | null>(null);

  const perProduct = (ts: Txn[], kind: string) => {
    const m = new Map<string, number>();
    ts.filter((t) => t.kind === kind).forEach((t) => t.transaction_items.forEach((i) => {
      if (!i.product_id) return;
      const p = products.find((x) => x.id === i.product_id);
      m.set(i.product_id, (m.get(i.product_id) ?? 0) + baseQty(p, units, i.unit_name, Number(i.qty)));
    }));
    return m;
  };

  const saveClosing = async (b: Branch, ids: string[], left: (id: string) => number) => {
    const rows = ids.filter((id) => counts[id] !== undefined && counts[id] !== "").map((id) => {
      const p = products.find((x) => x.id === id);
      const expected = left(id), counted = Number(counts[id]);
      const sold = expected - counted;
      return { branch_id: b.id, month: cur, product_id: id, product_name: p?.name ?? "-", unit: p?.unit ?? "", expected_qty: expected, counted_qty: counted, sold_qty: sold, amount: sold * Number(p?.price ?? 0) };
    });
    if (!rows.length) return void toast.error("กรอกน้ำหนักจริงอย่างน้อย 1 รายการ");
    const { error } = await supabase.from("stock_closings").insert(rows);
    if (error) return void toast.error(error.message);
    toast.success("บันทึกผลตรวจนับแล้ว");
    setCounting(null); setCounts({});
    inv("stock_closings");
  };

  return (
    <div className="space-y-4">
      <p className="px-1 text-sm text-muted-foreground">กระทบยอดสิ้นเดือน: เทียบยอดที่โอนไปสาขากับยอดขายหน้าร้านจริง และดูสินค้าคงเหลือที่สาขา</p>
      {months.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {months.map((m) => (
            <button key={m} onClick={() => setMonth(m)} className={`shrink-0 rounded-full border px-4 py-1.5 text-sm ${m === cur ? "bg-foreground text-background" : "hover:bg-muted"}`}>{monthLabel(m)}</button>
          ))}
        </div>
      )}
      {branches.map((b) => {
        const all = txns.filter((t) => t.branch_id === b.id);
        const mon = all.filter((t) => monthKey(t.created_at) === cur);
        const sent = mon.filter((t) => t.kind === "branch").reduce((s, t) => s + txnTotal(t), 0);
        const sold = mon.filter((t) => t.kind === "branch_sale").reduce((s, t) => s + txnTotal(t), 0);
        const inM = perProduct(mon, "branch"), outM = perProduct(mon, "branch_sale");
        const inAll = perProduct(all, "branch"), outAll = perProduct(all, "branch_sale");
        const ids = Array.from(new Set([...inAll.keys(), ...outAll.keys()]));
        const myClosings = closings.filter((c) => c.branch_id === b.id);
        if (!ids.length && !myClosings.length) return null;
        const left = (id: string) => (inAll.get(id) ?? 0) - (outAll.get(id) ?? 0);
        const rows: ShotRow[] = ids.map((id) => {
          const p = products.find((x) => x.id === id);
          return { name: p?.name ?? "-", unit: p?.unit ?? "", sent: inM.get(id) ?? 0, sold: outM.get(id) ?? 0, left: left(id) };
        });
        const isCounting = counting === b.id;
        const byMonth = new Map<string, Closing[]>();
        myClosings.forEach((c) => byMonth.set(c.month, [...(byMonth.get(c.month) ?? []), c]));
        return (
          <Card key={b.id}>
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-display text-lg">สาขา {b.name}</h3>
              <Button size="sm" variant="secondary" onClick={() => setShot({ branch: b.name, sent, sold, rows })}><Camera className="h-4 w-4" />สลิปสรุป</Button>
            </div>
            <div className="mt-2 grid grid-cols-3 gap-2 text-center text-sm">
              <div className="rounded-xl bg-muted/50 p-2"><p className="text-xs text-muted-foreground">มูลค่าโอนไป</p><p className="font-semibold">{baht(sent)}</p></div>
              <div className="rounded-xl bg-muted/50 p-2"><p className="text-xs text-muted-foreground">ขายจริงหน้าร้าน</p><p className="font-semibold">{baht(sold)}</p></div>
              <div className="rounded-xl bg-muted/50 p-2"><p className="text-xs text-muted-foreground">ส่วนต่าง</p><p className={`font-semibold ${sent - sold < 0 ? "text-destructive" : ""}`}>{baht(sent - sold)}</p></div>
            </div>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-muted-foreground"><tr><th className="py-1 text-left">สินค้า</th><th className="text-right">โอน (เดือน)</th><th className="text-right">ขาย (เดือน)</th><th className="text-right">คงเหลือสาขา</th>{isCounting && <th className="text-right">นับจริง</th>}</tr></thead>
                <tbody>
                  {ids.map((id) => {
                    const p = products.find((x) => x.id === id);
                    const l = left(id);
                    return (
                      <tr key={id} className="border-t">
                        <td className="py-1">{p?.name ?? "-"} <span className="text-xs text-muted-foreground">({p?.unit})</span></td>
                        <td className="text-right">{num(inM.get(id) ?? 0)}</td>
                        <td className="text-right">{num(outM.get(id) ?? 0)}</td>
                        <td className={`text-right font-medium ${l < 0 ? "text-destructive" : ""}`}>{num(l)}</td>
                        {isCounting && <td className="w-24 pl-2"><Input type="number" className="h-8 text-right" value={counts[id] ?? ""} onChange={(e) => setCounts({ ...counts, [id]: e.target.value })} /></td>}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">ส่วนต่าง = มูลค่าที่โอนไป − ยอดขายหน้าร้าน (ยอดที่ต้องเคลียร์) · คงเหลือสาขาคิดสะสมทุกเดือน</p>
            <div data-edit className="mt-3 flex gap-2">
              {isCounting ? (
                <>
                  <Button size="sm" variant="secondary" onClick={() => { setCounting(null); setCounts({}); }}>ยกเลิก</Button>
                  <Button size="sm" className="ig-gradient flex-1 border-0 text-on-gradient" onClick={() => saveClosing(b, ids, left)}>บันทึกผลตรวจนับ {monthLabel(cur)}</Button>
                </>
              ) : (
                <Button size="sm" variant="secondary" disabled={!ids.length} onClick={() => { setCounting(b.id); setCounts({}); }}><ClipboardCheck className="h-4 w-4" />บันทึกน้ำหนักจริงสิ้นเดือน</Button>
              )}
            </div>
            {myClosings.length > 0 && (
              <div className="mt-3 border-t pt-2">
                <button className="flex items-center gap-1 text-sm font-medium" onClick={() => setHistOpen(histOpen === b.id ? null : b.id)}><History className="h-4 w-4" />ประวัติการตรวจนับ ({byMonth.size} เดือน)</button>
                {histOpen === b.id && Array.from(byMonth.entries()).map(([m, cs]) => (
                  <div key={m} className="mt-2 rounded-xl bg-muted/50 p-2 text-xs">
                    <div className="flex justify-between font-semibold"><span>{monthLabel(m)}</span><span>รวม {baht(cs.reduce((s, c) => s + Number(c.amount), 0))}</span></div>
                    <p className="text-muted-foreground">บันทึกเมื่อ {fmtDateTime(cs[0]!.created_at)}</p>
                    <table className="mt-1 w-full">
                      <thead className="text-muted-foreground"><tr><th className="text-left">สินค้า</th><th className="text-right">ตามระบบ</th><th className="text-right">นับจริง</th><th className="text-right">ขายปลีกได้</th><th className="text-right">ยอดเงิน</th></tr></thead>
                      <tbody>
                        {cs.map((c) => (
                          <tr key={c.id}><td>{c.product_name} ({c.unit})</td><td className="text-right">{num(Number(c.expected_qty))}</td><td className="text-right">{num(Number(c.counted_qty))}</td><td className="text-right">{num(Number(c.sold_qty))}</td><td className="text-right">{baht(Number(c.amount))}</td></tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            )}
          </Card>
        );
      })}
      {shot && <ReconcileShotDialog {...shot} period={monthLabel(cur)} onClose={() => setShot(null)} />}
    </div>
  );
}
