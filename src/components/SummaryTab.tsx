import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useTable, useTransactions, baht, num, fmtDateTime, monthKey, monthLabel, txnTotal, type Branch, type Customer, type Txn } from "@/lib/db";
import { Card } from "./ConfirmDelete";

export function SummaryTab() {
  const { data: branches = [] } = useTable<Branch>("branches");
  const { data: customers = [] } = useTable<Customer>("customers");
  const { data: txns = [] } = useTransactions();
  const months = useMemo(() => Array.from(new Set(txns.map((t) => monthKey(t.created_at)))), [txns]);
  const [month, setMonth] = useState("all");
  const list = month === "all" ? txns : txns.filter((t) => monthKey(t.created_at) === month);

  const agg = (kind: "branch" | "customer") => {
    const src = kind === "branch" ? branches : customers;
    const rows = src.map((p) => {
      const ts = list.filter((t) => (kind === "branch" ? t.branch_id : t.customer_id) === p.id);
      return { name: p.name, bills: ts.length, qty: ts.reduce((s, t) => s + t.transaction_items.reduce((a, i) => a + Number(i.qty), 0), 0), total: ts.reduce((s, t) => s + txnTotal(t), 0) };
    }).sort((a, b) => b.total - a.total);
    return rows;
  };
  const bRows = agg("branch");
  const cRows = agg("customer");
  const bTot = bRows.reduce((s, r) => s + r.total, 0);
  const cTot = cRows.reduce((s, r) => s + r.total, 0);

  const Table = ({ title, rows, total }: { title: string; rows: ReturnType<typeof agg>; total: number }) => (
    <Card>
      <div className="mb-3 flex items-baseline justify-between"><h3 className="font-display text-lg">{title}</h3><span className="font-bold">{baht(total)}</span></div>
      {rows.length === 0 && <p className="text-sm text-muted-foreground">ไม่มีข้อมูล</p>}
      <div className="space-y-3">
        {rows.map((r) => (
          <div key={r.name}>
            <div className="flex justify-between text-sm"><span className="font-medium">{r.name}</span><span>{baht(r.total)}</span></div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted"><div className="ig-gradient h-full rounded-full" style={{ width: `${total ? (r.total / total) * 100 : 0}%` }} /></div>
            <p className="mt-0.5 text-xs text-muted-foreground">{r.bills} บิล · {r.qty.toLocaleString("th-TH")} หน่วย</p>
          </div>
        ))}
      </div>
    </Card>
  );

  return (
    <div className="space-y-4">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {["all", ...months].map((m) => (
          <button key={m} onClick={() => setMonth(m)} className={`shrink-0 rounded-full border px-4 py-1.5 text-sm ${m === month ? "bg-foreground text-background" : "hover:bg-muted"}`}>{m === "all" ? "ทั้งหมด" : monthLabel(m)}</button>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        {[["ยอดรวม", baht(bTot + cTot)], ["โอนสาขา", baht(bTot)], ["ลูกค้าพิเศษ", baht(cTot)]].map(([l, v]) => (
          <Card key={l} className="p-3"><p className="text-xs text-muted-foreground">{l}</p><p className="mt-1 font-bold">{v}</p></Card>
        ))}
      </div>
      <Table title="รายสาขา" rows={bRows} total={bTot} />
      <Table title="รายลูกค้า" rows={cRows} total={cTot} />
    </div>
  );
}
