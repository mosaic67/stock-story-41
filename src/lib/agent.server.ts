import { z } from "zod";
import { timingSafeEqual } from "crypto";

type Admin = (typeof import("@/integrations/supabase/client.server"))["supabaseAdmin"];
const lim = z.number().int().min(1).max(50).default(20);
const KINDS = ["transfer", "special", "branch_sale", "branch_move", "stock_in"] as const;

const item = z.object({
  product_id: z.string().uuid(),
  unit_name: z.string().min(1),
  qty: z.number().positive(),
  price: z.number().min(0).default(0),
  price_type: z.enum(["retail", "wholesale", "special", "custom"]).default("retail"),
  note: z.string().max(300).optional(),
});

type Action = {
  description: string;
  write: boolean;
  schema: z.ZodTypeAny;
  json: Record<string, unknown>;
  summary?: (p: any) => string;
  run: (db: Admin, p: any) => Promise<unknown>;
};

const must = <T>(r: { data: T; error: { message: string } | null }) => {
  if (r.error) throw new Error(r.error.message);
  return r.data;
};

export const ACTIONS: Record<string, Action> = {
  list_products: {
    description: "List products with main-warehouse stock (max 50).",
    write: false,
    schema: z.object({ search: z.string().max(100).optional(), limit: lim }),
    json: { type: "object", properties: { search: { type: "string" }, limit: { type: "integer", maximum: 50 } } },
    run: async (db, p) => {
      let q = db.from("products").select("id,code,name,unit,price,stock").order("code").limit(p.limit);
      if (p.search) q = q.or(`name.ilike.%${p.search.replace(/[,()%]/g, "")}%,code.ilike.%${p.search.replace(/[,()%]/g, "")}%`);
      return must(await q);
    },
  },
  list_branches: {
    description: "List branches (max 50).",
    write: false,
    schema: z.object({ limit: lim }),
    json: { type: "object", properties: { limit: { type: "integer", maximum: 50 } } },
    run: async (db, p) => must(await db.from("branches").select("id,name").order("name").limit(p.limit)),
  },
  list_customers: {
    description: "List special customers (max 50).",
    write: false,
    schema: z.object({ limit: lim }),
    json: { type: "object", properties: { limit: { type: "integer", maximum: 50 } } },
    run: async (db, p) => must(await db.from("customers").select("id,name,phone").order("name").limit(p.limit)),
  },
  list_transactions: {
    description: "List recent bills with items, newest first (max 50). month format YYYY-MM.",
    write: false,
    schema: z.object({
      kind: z.enum(KINDS).optional(),
      branch_id: z.string().uuid().optional(),
      customer_id: z.string().uuid().optional(),
      month: z.string().regex(/^\d{4}-\d{2}$/).optional(),
      limit: lim,
    }),
    json: {
      type: "object",
      properties: {
        kind: { type: "string", enum: KINDS },
        branch_id: { type: "string" },
        customer_id: { type: "string" },
        month: { type: "string", pattern: "^\\d{4}-\\d{2}$" },
        limit: { type: "integer", maximum: 50 },
      },
    },
    run: async (db, p) => {
      let q = db
        .from("transactions")
        .select("id,kind,created_at,branch_id,to_branch_id,customer_id,deduct_stock,note,transaction_items(product_name,qty,unit_name,price,price_type)")
        .order("created_at", { ascending: false })
        .limit(p.limit);
      if (p.kind) q = q.eq("kind", p.kind);
      if (p.branch_id) q = q.eq("branch_id", p.branch_id);
      if (p.customer_id) q = q.eq("customer_id", p.customer_id);
      if (p.month) {
        const [y, m] = p.month.split("-").map(Number);
        q = q.gte("created_at", new Date(Date.UTC(y, m - 1, 1)).toISOString()).lt("created_at", new Date(Date.UTC(y, m, 1)).toISOString());
      }
      return must(await q);
    },
  },
  create_product: {
    description: "Create a product. Code auto-generated (OBxxx).",
    write: true,
    schema: z.object({ name: z.string().min(1).max(200), unit: z.string().min(1).max(30), price: z.number().min(0), stock: z.number().min(0).default(0) }),
    json: {
      type: "object",
      required: ["name", "unit", "price"],
      properties: { name: { type: "string" }, unit: { type: "string" }, price: { type: "number" }, stock: { type: "number" } },
    },
    summary: (p) => `สร้างสินค้า "${p.name}" หน่วย ${p.unit} ราคา ${p.price} สต็อก ${p.stock}`,
    run: async (db, p) => {
      const codes = must(await db.from("products").select("code").ilike("code", "OB%")) as { code: string }[];
      const n = Math.max(0, ...codes.map((c) => Number(c.code.slice(2)) || 0)) + 1;
      const code = "OB" + String(n).padStart(3, "0");
      return must(await db.from("products").insert({ ...p, code }).select("id,code,name").single());
    },
  },
  update_product: {
    description: "Update product name/unit/price.",
    write: true,
    schema: z.object({ id: z.string().uuid(), name: z.string().min(1).max(200).optional(), unit: z.string().min(1).max(30).optional(), price: z.number().min(0).optional() }),
    json: {
      type: "object",
      required: ["id"],
      properties: { id: { type: "string" }, name: { type: "string" }, unit: { type: "string" }, price: { type: "number" } },
    },
    summary: (p) => `แก้ไขสินค้า ${p.id}: ${JSON.stringify({ name: p.name, unit: p.unit, price: p.price })}`,
    run: async (db, { id, ...rest }) => must(await db.from("products").update(rest).eq("id", id).select("id,code,name,unit,price").single()),
  },
  delete_product: {
    description: "Delete a product by id.",
    write: true,
    schema: z.object({ id: z.string().uuid() }),
    json: { type: "object", required: ["id"], properties: { id: { type: "string" } } },
    summary: (p) => `ลบสินค้า ${p.id}`,
    run: async (db, p) => {
      must(await db.from("products").delete().eq("id", p.id));
      return { deleted: p.id };
    },
  },
  create_transaction: {
    description:
      "Create a bill. kind: transfer (to branch, deducts main stock), special (customer; deduct_stock optional), branch_sale (branch retail), branch_move (branch_id=source, to_branch_id=destination), stock_in (receive into main stock).",
    write: true,
    schema: z
      .object({
        kind: z.enum(KINDS),
        branch_id: z.string().uuid().optional(),
        to_branch_id: z.string().uuid().optional(),
        customer_id: z.string().uuid().optional(),
        deduct_stock: z.boolean().optional(),
        note: z.string().max(500).optional(),
        items: z.array(item).min(1).max(50),
      })
      .superRefine((v, ctx) => {
        const need = (k: string) => ctx.addIssue({ code: "custom", message: `${k} required for ${v.kind}` });
        if (["transfer", "branch_sale", "branch_move"].includes(v.kind) && !v.branch_id) need("branch_id");
        if (v.kind === "special" && !v.customer_id) need("customer_id");
        if (v.kind === "branch_move" && (!v.to_branch_id || v.to_branch_id === v.branch_id)) need("distinct to_branch_id");
      }),
    json: {
      type: "object",
      required: ["kind", "items"],
      properties: {
        kind: { type: "string", enum: KINDS },
        branch_id: { type: "string" },
        to_branch_id: { type: "string" },
        customer_id: { type: "string" },
        deduct_stock: { type: "boolean" },
        note: { type: "string" },
        items: {
          type: "array",
          maxItems: 50,
          items: {
            type: "object",
            required: ["product_id", "unit_name", "qty"],
            properties: {
              product_id: { type: "string" },
              unit_name: { type: "string" },
              qty: { type: "number" },
              price: { type: "number", description: "unit price; for special/custom = line total" },
              price_type: { type: "string", enum: ["retail", "wholesale", "special", "custom"] },
              note: { type: "string" },
            },
          },
        },
      },
    },
    summary: (p) => `สร้างบิล ${p.kind} ${p.items.length} รายการ`,
    run: async (db, p) => {
      const ids = [...new Set(p.items.map((i: any) => i.product_id))];
      const prods = must(await db.from("products").select("id,name").in("id", ids as string[])) as { id: string; name: string }[];
      const nm = new Map(prods.map((x) => [x.id, x.name]));
      const missing = ids.filter((i) => !nm.has(i as string));
      if (missing.length) throw new Error(`Unknown product_id: ${missing.join(",")}`);
      const deduct = p.kind === "branch_move" || p.kind === "branch_sale" ? false : p.kind === "special" ? p.deduct_stock ?? true : true;
      const txn = must(
        await db
          .from("transactions")
          .insert({
            kind: p.kind,
            branch_id: p.kind === "special" || p.kind === "stock_in" ? null : p.branch_id,
            to_branch_id: p.kind === "branch_move" ? p.to_branch_id : null,
            customer_id: p.kind === "special" ? p.customer_id : null,
            deduct_stock: deduct,
            note: p.note ?? null,
          })
          .select("id")
          .single(),
      ) as { id: string };
      const r = await db.from("transaction_items").insert(
        p.items.map((i: any) => ({ ...i, note: i.note ?? null, transaction_id: txn.id, product_name: nm.get(i.product_id)! })),
      );
      if (r.error) {
        await db.from("transactions").delete().eq("id", txn.id);
        throw new Error(r.error.message);
      }
      return { id: txn.id };
    },
  },
  delete_transaction: {
    description: "Delete a bill by id (stock effects are reversed).",
    write: true,
    schema: z.object({ id: z.string().uuid() }),
    json: { type: "object", required: ["id"], properties: { id: { type: "string" } } },
    summary: (p) => `ลบบิล ${p.id}`,
    run: async (db, p) => {
      must(await db.from("transaction_items").delete().eq("transaction_id", p.id));
      must(await db.from("transactions").delete().eq("id", p.id));
      return { deleted: p.id };
    },
  },
};

export const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Agent-Key",
};

export const reply = (body: { success: boolean; data?: unknown; error?: string }, status = 200) =>
  Response.json(body, { status, headers: CORS });

export function authorized(req: Request) {
  const secret = process.env["AGENT_API_KEY"];
  const got = req.headers.get("x-agent-key") ?? "";
  if (!secret) return false;
  const a = Buffer.from(got), b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

export const toolList = () => {
  const base = Object.entries(ACTIONS).map(([action, a]) => ({ action, description: a.description, write: a.write, parameters: a.json }));
  const tools = base.map((t) => ({ ...t, name: t.action }));
  return { data: base, tools };
};

async function log(db: Admin, action: string, params: unknown, status: string, error?: string) {
  await db.from("agent_audit_logs").insert({ action, params: params as never, status, error: error ?? null });
}

class Timeout extends Error {}

export async function execute(req: Request): Promise<Response> {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return reply({ success: false, error: "Invalid JSON" }, 400);
  }
  const env = z.object({ action: z.string(), params: z.record(z.string(), z.unknown()).default({}), confirm: z.boolean().default(false) }).safeParse(body);
  if (!env.success) return reply({ success: false, error: "Body must be {action, params, confirm}" }, 400);
  const { action, params, confirm } = env.data;
  const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
  const a = ACTIONS[action];
  if (!a) {
    await log(db, action, params, "unknown_action");
    return reply({ success: false, error: `Unknown action: ${action}` }, 400);
  }
  const parsed = a.schema.safeParse(params);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => `${i.path.join(".") || "params"}: ${i.message}`).join("; ");
    await log(db, action, params, "invalid", msg);
    return reply({ success: false, error: msg }, 400);
  }
  if (a.write && !confirm) {
    await log(db, action, params, "pending_confirmation");
    return reply({ success: true, data: { requires_confirmation: true, summary: a.summary?.(parsed.data) ?? action } });
  }
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const data = await Promise.race([
      a.run(db, parsed.data),
      new Promise((_, rej) => (timer = setTimeout(() => rej(new Timeout("Execution exceeded 15s")), 15000))),
    ]);
    await log(db, action, params, "success");
    return reply({ success: true, data });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const to = e instanceof Timeout;
    await log(db, action, params, to ? "timeout" : "error", msg).catch(() => {});
    return reply({ success: false, error: msg }, to ? 504 : 500);
  } finally {
    clearTimeout(timer);
  }
}
