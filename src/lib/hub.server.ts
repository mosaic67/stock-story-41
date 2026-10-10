import { createHmac } from "crypto";

// Sends a bill to the external AI Hub bill webhook (HUB_BILL_WEBHOOK_URL), signed with HUB_INGEST_KEY.
export async function sendBillToHub(db: any, id: string): Promise<{ sent: boolean; error?: string }> {
  const url = process.env["HUB_BILL_WEBHOOK_URL"];
  const key = process.env["HUB_INGEST_KEY"];
  if (!url || !key) return { sent: false, error: "not_configured" };
  const { data, error } = await db
    .from("transactions")
    .select("id,kind,created_at,deduct_stock,note,branch:branches!transactions_branch_id_fkey(name),to_branch:branches!transactions_to_branch_id_fkey(name),customer:customers(name),transaction_items(product_name,qty,unit_name,price,price_type,note)")
    .eq("id", id)
    .single();
  if (error || !data) return { sent: false, error: error?.message ?? "not_found" };
  const items = (data.transaction_items ?? []).map((i: any) => ({
    ...i,
    total: i.price_type === "special" || i.price_type === "custom" ? Number(i.price) : Number(i.price) * Number(i.qty),
  }));
  const body = JSON.stringify({
    source: "OBWangnoiOG",
    bill: {
      id: data.id,
      kind: data.kind,
      created_at: data.created_at,
      branch: data.branch?.name ?? null,
      to_branch: data.to_branch?.name ?? null,
      customer: data.customer?.name ?? null,
      deduct_stock: data.deduct_stock,
      note: data.note,
      items,
      total: items.reduce((s: number, i: any) => s + i.total, 0),
    },
  });
  const sig = createHmac("sha256", key).update(body).digest("hex");
  try {
    const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json", "x-hub-signature": sig }, body, signal: AbortSignal.timeout(10000) });
    return r.ok ? { sent: true } : { sent: false, error: `HTTP ${r.status}` };
  } catch (e) {
    return { sent: false, error: e instanceof Error ? e.message : "fetch_failed" };
  }
}
