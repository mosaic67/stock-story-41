import { useMemo, useState } from "react";
import { Camera, ChevronDown, ChevronUp, Send } from "lucide-react";
import { SummaryShotDialog } from "./SummaryShotDialog";
import { BillShotDialog } from "./BillShotDialog";
import { useTable, useTransactions, baht, num, fmtDateTime, monthKey, monthLabel, txnTotal, lineTotal, shareToLine, type Branch, type Customer, type Txn } from "@/lib/db";
import { Card } from "./ConfirmDelete";

export function SummaryTab() {
  const { data: branches = [] } = useTable<Branch>("branches");
  const { data: customers = [] } = useTable<Customer>("customers");
  const { data: txns = [] } = useTransactions();
  const months = useMemo(() => Array.from(new Set(txns.map((t) => monthKey(t.created_at)))), [txns]);
  const [month, setMonth] = useState("all");
  const base = txns.filter((t) => t.kind !== "branch_sale" && t.kind !== "stock_in");
  const list = month === "all" ? base : base.filter((t) => monthKey(t.created_at) === month);

  const [open, setOpen] = useState<string | null>(null);
  const [shot, setShot] = useState<{ name: string; txns: Txn[] } | null>(null);
  const period = month === "all" ? "ทุกเดือน" : monthLabel(month);

  const agg = (kind: "branch" | "customer") => {
    const src = kind === "branch" ? branches : customers;
    const rows = src.map((p) => {
      const ts = list.filter((t) => kind === "branch" ? (t.branch_id === p.id || (t.kind === "branch_move" && t.to_branch_id === p.id)) : t.kind !== "branch_move" && t.customer_id === p.id);
      const sign = (t: Txn) => (t.kind === "branch_move" && t.branch_id === p.id ? -1 : 1);
      const noDeduct = ts.filter((t) => t.deduct_stock === false && t.kind !== "branch_move");
      const moves = ts.filter((t) => t.kind === "branch_move");
      return { id: p.id, name: p.name, txns: ts, noDeduct, moves, moveNet: moves.reduce((s, t) => s + sign(t) * txnTotal(t), 0), noDeductTotal: noDeduct.reduce((s, t) => s + txnTotal(t), 0), bills: ts.length, qty: ts.reduce((s, t) => s + sign(t) * t.transaction_items.reduce((a, i) => a + Number(i.qty), 0), 0), total: ts.reduce((s, t) => s + sign(t) * txnTotal(t), 0) };
    }).sort((a, b) => b.total - a.total);
    return rows;
  };
  const bRows = agg("branch");
  const cRows = agg("customer");
  const bTot = bRows.reduce((s, r) => s + r.total, 0);
  const cTot = cRows.reduce((s, r) => s + r.total, 0);
  const noDeductTot = list.filter((t) => t.deduct_stock === false && t.kind !== "branch_move").reduce((s, t) => s + txnTotal(t), 0);

  const BillDetail = ({ t, partyName }: { t: Txn; partyName: string }) => {
    const [zoom, setZoom] = useState(false);
    return (
    <div className="rounded-lg border bg-muted/40 p-3 text-sm">
      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">{fmtDateTime(t.created_at)}{t.kind === "branch_move" && <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium">ย้าย {branches.find((b) => b.id === t.branch_id)?.name} → {branches.find((b) => b.id === t.to_branch_id)?.name}</span>}{t.deduct_stock === false && t.kind !== "branch_move" && <span className="rounded-full bg-warn px-1.5 py-0.5 text-[10px] font-medium text-warn-foreground">ไม่หักสต๊อก</span>}</span>
        <span className="flex items-center gap-1">
          <button onClick={() => setZoom(true)} className="rounded-full p-1 hover:bg-muted" aria-label="ขยายบิลเพื่อแคปภาพ"><Camera className="h-3.5 w-3.5" /></button>
          <span className="font-semibold text-foreground">{baht(txnTotal(t))}</span>
        </span>
      </div>
      <div className="mt-1.5 space-y-0.5">
        {t.transaction_items.map((i) => (
          <div key={i.id} className="flex justify-between gap-2 text-xs">
            <span>• {i.product_name} {num(Number(i.qty))} {i.unit_name}{i.price_type === "special" ? " (ราคาพิเศษ)" : i.price_type === "custom" ? " (กำหนดราคาเอง)" : ` x ${baht(Number(i.price))}`}{i.note ? ` (${i.note})` : ""}</span>
            <span className="shrink-0">{baht(lineTotal(i))}</span>
          </div>
        ))}
      </div>
      {t.note && <p className="mt-1 text-xs text-muted-foreground">หมายเหตุ: {t.note}</p>}
      {zoom && <BillShotDialog t={t} partyName={partyName} onClose={() => setZoom(false)} />}
    </div>
    );
  };

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
                {r.moves.length > 0 && <p className="mt-0.5 text-xs text-muted-foreground">โอนระหว่างสาขา: {r.moves.length} บิล · สุทธิ {baht(r.moveNet)}</p>}
                {r.noDeduct.length > 0 && (
                  <p className="mt-0.5 text-xs text-warn-foreground">ไม่หักสต๊อก: {r.noDeduct.length} บิล · {baht(r.noDeductTotal)}</p>
                )}
              </button>
              {isOpen && (
                <div className="mt-2 space-y-2">
                  {r.txns.length === 0 && <p className="text-xs text-muted-foreground">ไม่มีบิลในช่วงนี้</p>}
                  {r.txns.length > 0 && (
                    <div className="flex gap-2">
                      <button onClick={() => shareToLine(`OBWangnoi OG — ${prefix === "b" ? "สาขา" : "ลูกค้า"} ${r.name} (${period})`, [...r.txns].sort((a, b) => a.created_at.localeCompare(b.created_at)), () => r.name)}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-full border py-2 text-xs font-semibold hover:bg-muted"><Send className="h-3.5 w-3.5" />แชร์ไลน์ทุกบิล</button>
                      <button onClick={() => setShot({ name: r.name, txns: r.txns })}
                        className="ig-gradient flex flex-1 items-center justify-center gap-1.5 rounded-full py-2 text-xs font-semibold text-on-gradient"><Camera className="h-3.5 w-3.5" />แคปรูปสรุปรวม</button>
                    </div>
                  )}
                  {r.noDeduct.length > 0 && (
                    <div className="rounded-lg border border-warn-border bg-warn p-2.5">
                      <div className="mb-1.5 flex items-baseline justify-between text-xs font-semibold text-warn-foreground">
                        <span>บิลไม่หักสต๊อก ({r.noDeduct.length} บิล)</span>
                        <span>{baht(r.noDeductTotal)}</span>
                      </div>
                      <div className="space-y-2">{r.noDeduct.map((t) => <BillDetail key={t.id} t={t} partyName={r.name} />)}</div>
                    </div>
                  )}
                  {r.noDeduct.length > 0 && r.txns.length > r.noDeduct.length && (
                    <p className="text-xs font-semibold text-muted-foreground">บิลหักสต๊อก ({r.txns.length - r.noDeduct.length} บิล) · {baht(r.total - r.noDeductTotal)}</p>
                  )}
                  {r.txns.filter((t) => t.deduct_stock !== false || t.kind === "branch_move").map((t) => <BillDetail key={t.id} t={t} partyName={r.name} />)}
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
      <div className="grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
        {[["ยอดรวม", baht(bTot + cTot)], ["โอนสาขา", baht(bTot)], ["ลูกค้าพิเศษ", baht(cTot)], ["ไม่หักสต๊อก", baht(noDeductTot)]].map(([l, v]) => (
          <Card key={l} className="p-3"><p className="text-xs text-muted-foreground">{l}</p><p className="mt-1 font-bold">{v}</p></Card>
        ))}
      </div>
      <Table title="รายสาขา" rows={bRows} total={bTot} prefix="b" />
      <Table title="รายลูกค้า" rows={cRows} total={cTot} prefix="c" />
      {shot && <SummaryShotDialog txns={shot.txns} partyName={shot.name} period={period} onClose={() => setShot(null)} />}
    </div>
  );
}
