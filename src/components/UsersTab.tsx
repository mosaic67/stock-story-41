import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "./ConfirmDelete";
import { fmtDateTime } from "@/lib/db";

export const PERM_TABS = [
  { id: "products", label: "สินค้า" },
  { id: "records", label: "บันทึก" },
  { id: "parties", label: "คู่ค้า" },
  { id: "summary", label: "สรุปยอด" },
  { id: "reconcile", label: "กระทบยอด" },
];

const TBL: Record<string, string> = {
  products: "สินค้า", product_units: "หน่วยย่อย", branches: "สาขา", customers: "ลูกค้า",
  customer_prices: "ราคาพิเศษ", transactions: "บิล", transaction_items: "รายการในบิล", profiles: "สิทธิ์ผู้ใช้",
};
const ACT: Record<string, string> = { INSERT: "เพิ่ม", UPDATE: "แก้ไข", DELETE: "ลบ" };

export function UsersTab() {
  const [view, setView] = useState<"users" | "log">("users");
  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {(["users", "log"] as const).map((v) => (
          <button key={v} onClick={() => setView(v)} className={`flex-1 rounded-full border py-2 text-sm font-semibold ${view === v ? "bg-foreground text-background" : "text-muted-foreground"}`}>
            {v === "users" ? "สิทธิ์ผู้ใช้" : "ประวัติการทำรายการ"}
          </button>
        ))}
      </div>
      {view === "users" ? <Users /> : <Log />}
    </div>
  );
}

function Users() {
  const qc = useQueryClient();
  const { data = [] } = useQuery({
    queryKey: ["profiles"],
    queryFn: async () => {
      const [{ data: p }, { data: r }] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at"),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      const admins = new Set((r ?? []).filter((x) => x.role === "admin").map((x) => x.user_id));
      return (p ?? []).map((x) => ({ ...x, admin: admins.has(x.id) }));
    },
  });
  const toggle = async (id: string, perms: string[], tab: string) => {
    const next = perms.includes(tab) ? perms.filter((x) => x !== tab) : [...perms, tab];
    const { error } = await supabase.from("profiles").update({ perms: next }).eq("id", id);
    if (error) return void toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["profiles"] });
  };
  return (
    <div className="space-y-3">
      {data.map((u) => (
        <Card key={u.id}>
          <div className="flex items-center justify-between">
            <span className="font-semibold">{u.username}</span>
            <span className="text-xs text-muted-foreground">{u.admin ? "Dev หลัก · ทำได้ทุกอย่าง" : u.perms.length ? "ดูอย่างเดียว" : "รออนุมัติ"}</span>
          </div>
          {!u.admin && (
            <div className="mt-3 flex flex-wrap gap-2">
              {PERM_TABS.map((t) => {
                const on = u.perms.includes(t.id);
                return (
                  <button key={t.id} onClick={() => toggle(u.id, u.perms, t.id)}
                    className={`rounded-full border px-3 py-1 text-xs font-medium ${on ? "border-foreground bg-foreground text-background" : "text-muted-foreground"}`}>
                    {on ? "✓ " : ""}{t.label}
                  </button>
                );
              })}
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}

function Log() {
  const [limit, setLimit] = useState(100);
  const { data = [] } = useQuery({
    queryKey: ["audit", limit],
    queryFn: async () => (await supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(limit)).data ?? [],
  });
  const desc = (r: { row_data: unknown }) => {
    const d = (r.row_data ?? {}) as Record<string, any>;
    const x = (d["new"] ?? d) as Record<string, any>;
    return x["name"] ?? x["product_name"] ?? x["username"] ?? x["unit_name"] ?? x["code"] ?? x["kind"] ?? "";
  };
  return (
    <Card className="divide-y p-0">
      {data.map((r) => (
        <div key={r.id} className="flex items-start justify-between gap-2 px-4 py-2 text-sm">
          <div>
            <span className="font-medium">{r.username ?? "ระบบ"}</span>{" "}
            <span className={r.action === "DELETE" ? "text-destructive" : ""}>{ACT[r.action] ?? r.action}</span>{" "}
            {TBL[r.table_name] ?? r.table_name} <span className="text-muted-foreground">{String(desc(r))}</span>
          </div>
          <span className="shrink-0 text-xs text-muted-foreground">{fmtDateTime(r.created_at)}</span>
        </div>
      ))}
      {data.length >= limit && (
        <button onClick={() => setLimit(limit + 100)} className="w-full py-2 text-sm text-muted-foreground">ดูเพิ่ม</button>
      )}
      {!data.length && <p className="p-4 text-center text-sm text-muted-foreground">ยังไม่มีประวัติ</p>}
    </Card>
  );
}
