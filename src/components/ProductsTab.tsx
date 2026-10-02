import { useState } from "react";
import { Plus, Package, Pencil, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTable, useInvalidate, baht, type Product, type ProductUnit } from "@/lib/db";
import { ConfirmDelete, Card } from "./ConfirmDelete";

export function ProductsTab() {
  const { data: products = [] } = useTable<Product>("products");
  const { data: units = [] } = useTable<ProductUnit>("product_units");
  const inv = useInvalidate();
  const [form, setForm] = useState({ code: "", name: "", unit: "", price: "" });
  const [editing, setEditing] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const nextCode = () => {
    const max = products.reduce((m, p) => {
      const match = /^OB(\d+)$/i.exec(p.code.trim());
      return match ? Math.max(m, Number(match[1])) : m;
    }, 0);
    return `OB${String(max + 1).padStart(3, "0")}`;
  };

  const save = async () => {
    if (!form.name) return void toast.error("กรุณากรอกชื่อสินค้า");
    const row = { code: editing ? form.code.trim() : nextCode(), name: form.name.trim(), unit: form.unit.trim() || "ชิ้น", price: Number(form.price) || 0 };
    const { error } = editing
      ? await supabase.from("products").update(row).eq("id", editing)
      : await supabase.from("products").insert(row);
    if (error) return void toast.error(error.message.includes("duplicate") ? "รหัสสินค้านี้มีอยู่แล้ว" : error.message);
    toast.success(editing ? "แก้ไขสินค้าแล้ว" : "เพิ่มสินค้าแล้ว");
    setForm({ code: "", name: "", unit: "", price: "" });
    setEditing(null);
    inv("products");
  };

  const list = products.filter((p) => `${p.code} ${p.name}`.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-4">
      <Card data-edit>
        <h2 className="mb-3 font-display text-lg">{editing ? "แก้ไขสินค้า" : "เพิ่มสินค้าใหม่"}</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="flex h-10 items-center rounded-md border bg-muted px-3 text-sm text-muted-foreground">
            รหัส: <span className="ml-1 font-semibold text-foreground">{editing ? form.code : nextCode()}</span>
          </div>
          <Input placeholder="ชื่อสินค้า" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input placeholder="หน่วยนับ เช่น ลัง" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
          <Input placeholder="ราคาขาย" type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
        </div>
        <div className="mt-3 flex gap-2">
          <Button onClick={save} className="ig-gradient border-0 text-on-gradient"><Plus className="h-4 w-4" />{editing ? "บันทึก" : "เพิ่มสินค้า"}</Button>
          {editing && <Button variant="ghost" onClick={() => { setEditing(null); setForm({ code: "", name: "", unit: "", price: "" }); }}>ยกเลิก</Button>}
        </div>
      </Card>

      <Input placeholder="ค้นหาสินค้า..." value={search} onChange={(e) => setSearch(e.target.value)} className="rounded-full bg-muted" />

      <Card>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">มูลค่าสต๊อกคงเหลือรวม ({list.length} รายการ)</span>
          <span className="font-display text-xl font-semibold">{baht(list.reduce((s, p) => s + Math.max(0, Number(p.stock)) * Number(p.price), 0))}</span>
        </div>
      </Card>

      {list.length === 0 && <p className="py-10 text-center text-muted-foreground">ยังไม่มีสินค้า</p>}
      {list.map((p) => (
        <Card key={p.id}>
          <div className="flex items-center gap-3">
            <div className="ig-ring shrink-0"><div className="flex h-11 w-11 items-center justify-center rounded-full bg-card"><Package className="h-5 w-5" /></div></div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{p.name}</p>
              <p className="text-xs text-muted-foreground">#{p.code} · {baht(Number(p.price))} / {p.unit}</p>
              <p className={`text-xs font-semibold ${Number(p.stock) <= 0 ? "text-destructive" : "text-foreground"}`}>คงเหลือ {Number(Number(p.stock).toFixed(2)).toLocaleString("th-TH")} {p.unit} · มูลค่า {baht(Math.max(0, Number(p.stock)) * Number(p.price))}</p>
            </div>
            <button data-edit className="rounded-full p-2 text-muted-foreground hover:bg-muted" onClick={() => { setEditing(p.id); setForm({ code: p.code, name: p.name, unit: p.unit, price: String(p.price) }); window.scrollTo({ top: 0, behavior: "smooth" }); }}><Pencil className="h-4 w-4" /></button>
            <ConfirmDelete label={p.name} onConfirm={async () => { await supabase.from("products").delete().eq("id", p.id); inv("products", "product_units"); toast.success("ลบแล้ว"); }} />
          </div>
          <StockAdjust product={p} />
          <SubUnits product={p} units={units.filter((u) => u.product_id === p.id)} />
        </Card>
      ))}
    </div>
  );
}

function StockAdjust({ product }: { product: Product }) {
  const inv = useInvalidate();
  const [v, setV] = useState("");
  const apply = async (mode: "add" | "set") => {
    const n = Number(v);
    if (!v || isNaN(n)) return void toast.error("กรอกจำนวน");
    const stock = mode === "add" ? Number(product.stock) + n : n;
    const { error } = await supabase.from("products").update({ stock }).eq("id", product.id);
    if (error) return void toast.error(error.message);
    toast.success(mode === "add" ? `รับเข้า ${n} ${product.unit}` : "ปรับยอดสต๊อกแล้ว");
    setV("");
    inv("products");
  };
  return (
    <div data-edit className="mt-3 flex gap-2 border-t pt-3">
      <Input placeholder={`จำนวน (${product.unit})`} type="number" value={v} onChange={(e) => setV(e.target.value)} className="h-9" />
      <Button size="sm" variant="secondary" onClick={() => apply("add")}>+ รับเข้า</Button>
      <Button size="sm" variant="outline" onClick={() => apply("set")}>ตั้งยอด</Button>
    </div>
  );
}

function SubUnits({ product, units }: { product: Product; units: ProductUnit[] }) {
  const inv = useInvalidate();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ unit_name: "", qty_per: "", retail_price: "", wholesale_price: "" });
  const add = async () => {
    if (!f.unit_name) return void toast.error("กรอกชื่อหน่วยย่อย");
    const { error } = await supabase.from("product_units").insert({
      product_id: product.id, unit_name: f.unit_name, qty_per: Number(f.qty_per) || 1,
      retail_price: Number(f.retail_price) || 0, wholesale_price: Number(f.wholesale_price) || 0,
    });
    if (error) return void toast.error(error.message);
    setF({ unit_name: "", qty_per: "", retail_price: "", wholesale_price: "" });
    setOpen(false);
    inv("product_units");
  };
  return (
    <div className="mt-3 border-t pt-3">
      <div className="flex flex-wrap gap-2">
        {units.map((u) => (
          <div key={u.id} className="flex items-center gap-2 rounded-full border bg-muted/50 py-1 pl-3 pr-1 text-xs">
            <span className="font-medium">{u.unit_name}</span>
            <span className="text-muted-foreground">({u.qty_per}/{product.unit})</span>
            <span>ปลีก {baht(Number(u.retail_price))}</span>
            <span>ส่ง {baht(Number(u.wholesale_price))}</span>
            <ConfirmDelete label={`หน่วย ${u.unit_name}`} onConfirm={async () => { await supabase.from("product_units").delete().eq("id", u.id); inv("product_units"); }} />
          </div>
        ))}
        <button data-edit onClick={() => setOpen(!open)} className="flex items-center gap-1 rounded-full border border-dashed px-3 py-1 text-xs text-muted-foreground hover:text-foreground">
          {open ? <X className="h-3 w-3" /> : <Plus className="h-3 w-3" />} หน่วยย่อย / ราคาปลีก-ส่ง
        </button>
      </div>
      {open && (
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-5">
          <Input placeholder="หน่วยย่อย เช่น แพ็ค" value={f.unit_name} onChange={(e) => setF({ ...f, unit_name: e.target.value })} />
          <Input placeholder={`จำนวนต่อ${product.unit}`} type="number" value={f.qty_per} onChange={(e) => setF({ ...f, qty_per: e.target.value })} />
          <Input placeholder="ราคาปลีก" type="number" value={f.retail_price} onChange={(e) => setF({ ...f, retail_price: e.target.value })} />
          <Input placeholder="ราคาส่ง" type="number" value={f.wholesale_price} onChange={(e) => setF({ ...f, wholesale_price: e.target.value })} />
          <Button onClick={add} variant="secondary">เพิ่ม</Button>
        </div>
      )}
    </div>
  );
}
