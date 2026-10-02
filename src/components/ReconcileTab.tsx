import { useMemo, useState } from "react";
import { useTable, useTransactions, baht, num, monthKey, monthLabel, txnTotal, baseQty, type Branch, type Product, type ProductUnit, type Txn } from "@/lib/db";
import { Card } from "./ConfirmDelete";

export function ReconcileTab() {
  const { data: branches = [] } = useTable<Branch>("branches");
  const { data: products = [] } = useTable<Product>("products");
  const { data: units = [] } = useTable<ProductUnit>("product_units");
  const { data: txns = [] } = useTransactions();
  const months = useMemo(() => Array.from(new Set(txns.map((t) => monthKey(t.created_at)))), [txns]);
  const [month, setMonth] = useState("");
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
        if (!ids.length) return null;
        return (
          <Card key={b.id}>
            <h3 className="font-display text-lg">สาขา {b.name}</h3>
            <div className="mt-2 grid grid-cols-3 gap-2 text-center text-sm">
              <div className="rounded-xl bg-muted/50 p-2"><p className="text-xs text-muted-foreground">มูลค่าโอนไป</p><p className="font-semibold">{baht(sent)}</p></div>
              <div className="rounded-xl bg-muted/50 p-2"><p className="text-xs text-muted-foreground">ขายจริงหน้าร้าน</p><p className="font-semibold">{baht(sold)}</p></div>
              <div className="rounded-xl bg-muted/50 p-2"><p className="text-xs text-muted-foreground">ส่วนต่าง</p><p className={`font-semibold ${sent - sold < 0 ? "text-destructive" : ""}`}>{baht(sent - sold)}</p></div>
            </div>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-muted-foreground"><tr><th className="py-1 text-left">สินค้า</th><th className="text-right">โอน (เดือน)</th><th className="text-right">ขาย (เดือน)</th><th className="text-right">คงเหลือสาขา</th></tr></thead>
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
            <p className="mt-2 text-xs text-muted-foreground">ส่วนต่าง = มูลค่าที่โอนไป − ยอดขายหน้าร้าน (ยอดที่ต้องเคลียร์) · คงเหลือสาขาคิดสะสมทุกเดือน</p>
          </Card>
        );
      })}
    </div>
  );
}
