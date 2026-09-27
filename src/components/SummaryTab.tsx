import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useTable, useTransactions, baht, num, fmtDateTime, monthKey, monthLabel, txnTotal, lineTotal, type Branch, type Customer, type Txn } from "@/lib/db";
import { Card } from "./ConfirmDelete";

export function SummaryTab() {
  const { data: branches = [] } = useTable<Branch>("branches");
  const { data: customers = [] } = useTable<Customer>("customers");
  const { data: txns = [] } = useTransactions();
  const months = useMemo(() => Array.from(new Set(txns.map((t) => monthKey(t.created_at)))), [txns]);
  const [month, setMonth] = useState("all");
  const list = month === "all" ? txns : txns.filter((t) => monthKey(t.created_at) === month);

  const [open, setOpen] = useState<string | null>(null);

  const agg = (kind: "branch" | "customer") => {
    const src = kind === "branch" ? branches : customers;
    const rows = src.map((p) => {
      const ts = list.filter((t) => (kind === "branch" ? t.branch_id : t.customer_id) === p.id);
      return { id: p.id, name: p.name, txns: ts, bills: ts.length, qty: ts.reduce((s, t) => s + t.transaction_items.reduce((a, i) => a + Number(i.qty), 0), 0), total: ts.reduce((s, t) => s + txnTotal(t), 0) };
    }).sort((a, b) => b.total - a.total);
    return rows;
  };
  const bRows = agg("branch");
  const cRows = agg("customer");
  const bTot = bRows.reduce((s, r) => s + r.total, 0);
  const cTot = cRows.reduce((s, r) => s + r.total, 0);

  const BillDetail = ({ t }: { t: Txn }) => (
    <div className="rounded-lg border bg-muted/40 p-3 text-sm">
      <div className="flex justify-between text-xs text-muted-foreground"><span>{fmtDateTime(t.created_at)}</span><span className="font-semibold text-foreground">{baht(txnTotal(t))}</span></div>
      <div className="mt-1.5 space-y-0.5">
        {t.transaction_items.map((i) => (
          <div key={i.id} className="flex justify-between gap-2 text-xs">
            <span>• {i.product_name} {num(Number(i.qty))} {i.unit_name}{i.price_type === "special" ? " (ราคาพิเศษ)" : ` x ${baht(Number(i.price))}`}{i.note ? ` (${i.note})` : ""}</span>
            <span className="shrink-0">{baht(lineTotal(i))}</span>
          </div>
        ))}
      </div>
      {t.note && <p className="mt-1 text-xs text-muted-foreground">หมายเหตุ: {t.note}</p>}
    </div>
  );

  const Table = ({ title, rows, total, prefix }: { title: string; rows: ReturnType<typeof agg>; total: number; prefix: string }) => (
    <Card>
      <div className="mb-3 flex items-baseline justify-between"><h3 className="font-display text-lg">{title}</h3><span className="font-bold">{baht(total)}</span></div>
      {rows.length === 0 && <p className="text-sm text-muted-foreground">ไม่มีข้อมูล</p>}
      <div className="space-y-3">
        {rows.map((r) => {
          const key = `${prefix}-${r.id}`;
          const isOpen = open === key;
          return (
            <div key={r.id}>
              <button onClick={() => setOpen(isOpen ? null : key)} className="w-full text-left">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1 font-medium">{r.name}{isOpen ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}</span>
                  <span>{baht(r.total)}</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted"><div className="ig-gradient h-full rounded-full" style={{ width: `${total ? (r.total / total) * 100 : 0}%` }} /></div>
                <p className="mt-0.5 text-xs text-muted-foreground">{r.bills} บิล · {r.qty.toLocaleString("th-TH")} หน่วย</p>
              </button>
              {isOpen && (
                <div className="mt-2 space-y-2">
                  {r.txns.length === 0 && <p className="text-xs text-muted-foreground">ไม่มีบิลในช่วงนี้</p>}
                  {r.txns.map((t) => <BillDetail key={t.id} t={t} />)}
                </div>
              )}
            </div>
          );
        })}
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
      <Table title="รายสาขา" rows={bRows} total={bTot} prefix="b" />
      <Table title="รายลูกค้า" rows={cRows} total={cTot} prefix="c" />
    </div>
  );
}
