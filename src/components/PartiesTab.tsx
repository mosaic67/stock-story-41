import { useState } from "react";
import { ChevronLeft, Plus, Send, Store, User } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  useTable, useTransactions, useInvalidate, baht, txnTotal, shareToLine, monthKey, monthLabel,
  type Branch, type Customer, type CustomerPrice, type Product, type ProductUnit,
} from "@/lib/db";
import { ConfirmDelete, Card } from "./ConfirmDelete";
import { TxnCard, usePartyName } from "./RecordsTab";

type Sel = { kind: "branch" | "customer"; id: string; name: string } | null;

export function PartiesTab() {
  const { data: branches = [] } = useTable<Branch>("branches");
  const { data: customers = [] } = useTable<Customer>("customers");
  const { data: txns = [] } = useTransactions();
  const inv = useInvalidate();
  const [sel, setSel] = useState<Sel>(null);
  const [bn, setBn] = useState("");
  const [cn, setCn] = useState({ name: "", phone: "" });

  if (sel) return <PartyDetail sel={sel} onBack={() => setSel(null)} />;

  const totalOf = (kind: string, id: string) =>
    txns.filter((t) => (kind === "branch" ? t.branch_id : t.customer_id) === id).reduce((s, t) => s + txnTotal(t), 0);

  const addBranch = async () => {
    if (!bn.trim()) return;
    const { error } = await supabase.from("branches").insert({ name: bn.trim() });
    if (error) return void toast.error(error.message);
    setBn(""); inv("branches");
  };
  const addCustomer = async () => {
    if (!cn.name.trim()) return;
    const { error } = await supabase.from("customers").insert({ name: cn.name.trim(), phone: cn.phone || null });
    if (error) return void toast.error(error.message);
    setCn({ name: "", phone: "" }); inv("customers");
  };

  const Row = ({ kind, id, name, sub }: { kind: "branch" | "customer"; id: string; name: string; sub?: string | null }) => (
    <div className="flex items-center gap-3 py-2">
      <button className="flex min-w-0 flex-1 items-center gap-3 text-left" onClick={() => setSel({ kind, id, name })}>
        <div className="ig-ring shrink-0"><div className="flex h-11 w-11 items-center justify-center rounded-full bg-card">{kind === "branch" ? <Store className="h-5 w-5" /> : <User className="h-5 w-5" />}</div></div>
        <div className="min-w-0">
          <p className="truncate font-semibold">{name}</p>
          <p className="text-xs text-muted-foreground">{sub ? sub + " · " : ""}ยอดรวม {baht(totalOf(kind, id))}</p>
        </div>
      </button>
      <ConfirmDelete label={name} onConfirm={async () => { await supabase.from(kind === "branch" ? "branches" : "customers").delete().eq("id", id); inv("branches", "customers", "customer_prices"); }} />
    </div>
  );

  return (
    <div className="space-y-4">
      <Card>
        <h2 className="mb-2 font-display text-lg">สาขา</h2>
        <div className="flex gap-2"><Input placeholder="ชื่อสาขาใหม่" value={bn} onChange={(e) => setBn(e.target.value)} /><Button onClick={addBranch} variant="secondary"><Plus className="h-4 w-4" /></Button></div>
        <div className="mt-2 divide-y">{branches.map((b) => <Row key={b.id} kind="branch" id={b.id} name={b.name} />)}</div>
      </Card>
      <Card>
        <h2 className="mb-2 font-display text-lg">ลูกค้าพิเศษ</h2>
        <div className="flex gap-2">
          <Input placeholder="ชื่อลูกค้า" value={cn.name} onChange={(e) => setCn({ ...cn, name: e.target.value })} />
          <Input placeholder="เบอร์โทร" value={cn.phone} onChange={(e) => setCn({ ...cn, phone: e.target.value })} />
          <Button onClick={addCustomer} variant="secondary"><Plus className="h-4 w-4" /></Button>
        </div>
        <div className="mt-2 divide-y">{customers.map((c) => <Row key={c.id} kind="customer" id={c.id} name={c.name} sub={c.phone} />)}</div>
      </Card>
    </div>
  );
}

function PartyDetail({ sel, onBack }: { sel: NonNullable<Sel>; onBack: () => void }) {
  const { data: txns = [] } = useTransactions();
  const party = usePartyName();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const list = txns.filter((t) => {
    if ((sel.kind === "branch" ? t.branch_id : t.customer_id) !== sel.id) return false;
    const d = t.created_at.slice(0, 10);
    return (!from || d >= from) && (!to || d <= to);
  });
  const byMonth = new Map<string, number>();
  list.forEach((t) => byMonth.set(monthKey(t.created_at), (byMonth.get(monthKey(t.created_at)) ?? 0) + txnTotal(t)));

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ChevronLeft className="h-4 w-4" />กลับ</button>
      <Card>
        <div className="flex items-center gap-4">
          <div className="ig-ring"><div className="flex h-16 w-16 items-center justify-center rounded-full bg-card">{sel.kind === "branch" ? <Store className="h-7 w-7" /> : <User className="h-7 w-7" />}</div></div>
          <div className="flex-1">
            <h2 className="font-display text-xl">{sel.name}</h2>
            <div className="mt-1 flex gap-5 text-sm"><span><b>{list.length}</b> บิล</span><span><b>{baht(list.reduce((s, t) => s + txnTotal(t), 0))}</b> ยอดรวม</span></div>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <Button className="ig-gradient mt-3 w-full border-0 text-primary-foreground" disabled={!list.length}
          onClick={() => shareToLine(`OBWangnoi OG — ${sel.kind === "branch" ? "สาขา" : "ลูกค้า"} ${sel.name}`, [...list].reverse(), party)}>
          <Send className="h-4 w-4" />แชร์ไปไลน์
        </Button>
        {byMonth.size > 0 && (
          <div className="mt-3 space-y-1 border-t pt-3 text-sm">
            {Array.from(byMonth.entries()).map(([m, v]) => <div key={m} className="flex justify-between"><span>{monthLabel(m)}</span><span className="font-medium">{baht(v)}</span></div>)}
          </div>
        )}
      </Card>
      {sel.kind === "customer" && <SpecialPrices customerId={sel.id} />}
      {list.map((t) => <TxnCard key={t.id} t={t} />)}
      {!list.length && <p className="py-6 text-center text-muted-foreground">ไม่มีรายการ</p>}
    </div>
  );
}

function SpecialPrices({ customerId }: { customerId: string }) {
  const { data: products = [] } = useTable<Product>("products");
  const { data: units = [] } = useTable<ProductUnit>("product_units");
  const { data: prices = [] } = useTable<CustomerPrice>("customer_prices", "");
  const inv = useInvalidate();
  const [f, setF] = useState({ product_id: "", unit_name: "", price: "" });
  const mine = prices.filter((p) => p.customer_id === customerId);
  const unitNames = (pid: string) => {
    const p = products.find((x) => x.id === pid);
    return p ? [p.unit, ...units.filter((u) => u.product_id === pid).map((u) => u.unit_name)] : [];
  };
  const save = async () => {
    if (!f.product_id || !f.price) return void toast.error("เลือกสินค้าและกรอกราคา");
    const { error } = await supabase.from("customer_prices").upsert(
      { customer_id: customerId, product_id: f.product_id, unit_name: f.unit_name || (unitNames(f.product_id)[0] ?? ""), price: Number(f.price) },
      { onConflict: "customer_id,product_id,unit_name" });
    if (error) return void toast.error(error.message);
    setF({ product_id: "", unit_name: "", price: "" }); inv("customer_prices"); toast.success("บันทึกราคาพิเศษแล้ว");
  };
  const sel = "h-9 w-full rounded-md border bg-background px-3 text-sm";
  return (
    <Card>
      <h3 className="mb-2 font-display">ราคาพิเศษของลูกค้านี้</h3>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <select className={`${sel} col-span-2 sm:col-span-1`} value={f.product_id} onChange={(e) => setF({ product_id: e.target.value, unit_name: unitNames(e.target.value)[0] ?? "", price: f.price })}>
          <option value="">— สินค้า —</option>
          {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select className={sel} value={f.unit_name} onChange={(e) => setF({ ...f, unit_name: e.target.value })}>
          {unitNames(f.product_id).map((u) => <option key={u}>{u}</option>)}
        </select>
        <Input type="number" placeholder="ราคาพิเศษ" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} />
        <Button variant="secondary" onClick={save}>บันทึก</Button>
      </div>
      <div className="mt-2 divide-y text-sm">
        {mine.map((p) => (
          <div key={p.id} className="flex items-center justify-between py-1">
            <span>{products.find((x) => x.id === p.product_id)?.name} / {p.unit_name}</span>
            <span className="flex items-center gap-1 font-medium">{baht(Number(p.price))}<ConfirmDelete label="ราคาพิเศษนี้" onConfirm={async () => { await supabase.from("customer_prices").delete().eq("id", p.id); inv("customer_prices"); }} /></span>
          </div>
        ))}
      </div>
    </Card>
  );
}
