import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Product = Tables<"products">;
export type ProductUnit = Tables<"product_units">;
export type Branch = Tables<"branches">;
export type Customer = Tables<"customers">;
export type CustomerPrice = Tables<"customer_prices">;
export type Txn = Tables<"transactions"> & { transaction_items: Tables<"transaction_items">[] };
export type StockCount = Tables<"stock_counts">;
export type TxnItem = Tables<"transaction_items">;

type TableName = "products" | "product_units" | "branches" | "customers" | "customer_prices" | "stock_counts";

export function useTable<T>(table: TableName, order = "created_at") {
  return useQuery({
    queryKey: [table],
    queryFn: async () => {
      const q = supabase.from(table).select("*");
      const { data, error } = order ? await q.order(order as never, { ascending: true }) : await q;
      if (error) throw error;
      return (data ?? []) as T[];
    },
  });
}

export function useTransactions() {
  return useQuery({
    queryKey: ["transactions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("*, transaction_items(*)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Txn[];
    },
  });
}

export function useInvalidate() {
  const qc = useQueryClient();
  return (...keys: string[]) => keys.forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
}

export const baht = (n: number) =>
  "฿" + Number(n || 0).toLocaleString("th-TH", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
export const num = (n: number) => Number(n || 0).toLocaleString("th-TH", { maximumFractionDigits: 2 });
export const fmtDateTime = (s: string) =>
  new Date(s).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" });
export const fmtDate = (s: string) => new Date(s).toLocaleDateString("th-TH", { dateStyle: "medium" });
export const monthKey = (s: string) => {
  const d = new Date(s);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};
export const dayKey = (s: string) => {
  const d = new Date(s);
  return `${monthKey(s)}-${String(d.getDate()).padStart(2, "0")}`;
};
export const monthLabel = (k: string) => {
  const [y = 2000, m = 1] = k.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("th-TH", { month: "long", year: "numeric" });
};
// ราคาพิเศษ/กำหนดเอง: price คือยอดรวมของรายการนั้นเลย ไม่คูณจำนวน
export const lineTotal = (i: { qty: number; price: number; price_type: string }) =>
  i.price_type === "special" || i.price_type === "custom" ? Number(i.price) : Number(i.qty) * Number(i.price);
export const txnTotal = (t: Txn) => t.transaction_items.reduce((s, i) => s + lineTotal(i), 0);

export const shareText = (text: string) => window.open(`https://line.me/R/share?text=${encodeURIComponent(text)}`, "_blank");

export function shareToLine(title: string, txns: Txn[], partyName: (t: Txn) => string) {
  const lines: string[] = [title, ""];
  let grand = 0;
  for (const t of txns) {
    lines.push(`🕒 ${fmtDateTime(t.created_at)} — ${partyName(t)}`);
    for (const i of t.transaction_items) {
      const sub = lineTotal(i);
      lines.push(`• ${i.product_name} ${num(Number(i.qty))} ${i.unit_name}${i.price_type === "special" ? " (ราคาพิเศษ)" : i.price_type === "custom" ? " (กำหนดราคาเอง)" : ` x ${baht(Number(i.price))}`} = ${baht(sub)}${i.note ? ` (${i.note})` : ""}`);
    }
    const tot = txnTotal(t);
    grand += tot;
    if (t.note) lines.push(`หมายเหตุ: ${t.note}`);
    lines.push(`รวมบิล: ${baht(tot)}`, "");
  }
  if (txns.length > 1) lines.push(`ยอดรวมทั้งหมด: ${baht(grand)}`);
  const text = lines.join("\n");
  window.open(`https://line.me/R/share?text=${encodeURIComponent(text)}`, "_blank");
}

// แปลงจำนวนเป็นหน่วยหลักของสินค้า (รองรับ กรัม/ขีด/กิโล)
const WEIGHT: Record<string, number> = { "กรัม": 1, "ก.": 1, g: 1, "ขีด": 100, "กิโล": 1000, "กิโลกรัม": 1000, "กก.": 1000, kg: 1000 };
export function baseQty(p: Product | undefined, units: ProductUnit[], unit: string, qty: number) {
  if (!p) return qty;
  if (unit === p.unit) return qty;
  const a = WEIGHT[unit], b = WEIGHT[p.unit];
  if (a && b) return (qty * a) / b;
  const u = units.find((x) => x.product_id === p.id && x.unit_name === unit);
  return qty / (Number(u?.qty_per) || 1);
}
