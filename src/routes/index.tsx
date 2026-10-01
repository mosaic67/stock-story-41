import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Package, ClipboardList, Store, BarChart3, Scale, Moon, Sun } from "lucide-react";
import { ProductsTab } from "@/components/ProductsTab";
import { RecordsTab } from "@/components/RecordsTab";
import { PartiesTab } from "@/components/PartiesTab";
import { ReconcileTab } from "@/components/ReconcileTab";
import { SummaryTab } from "@/components/SummaryTab";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "OBWangnoi OG — จัดการสินค้าและยอดโอน" },
      { name: "description", content: "บันทึกสินค้า โอนสาขา ขายลูกค้าพิเศษ และสรุปยอดรายวัน รายเดือน" },
      { property: "og:title", content: "OBWangnoi OG" },
      { property: "og:description", content: "ระบบจัดการสินค้าคงคลัง โอนสาขา และสรุปยอด" },
    ],
  }),
  component: Index,
});

const TABS = [
  { id: "products", label: "สินค้า", icon: Package },
  { id: "records", label: "บันทึก", icon: ClipboardList },
  { id: "parties", label: "คู่ค้า", icon: Store },
  { id: "summary", label: "สรุปยอด", icon: BarChart3 },
  { id: "reconcile", label: "กระทบยอด", icon: Scale },
] as const;

function Index() {
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("products");
  const [dark, setDark] = useState(false);
  useEffect(() => setDark(document.documentElement.classList.contains("dark")), []);
  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try { localStorage.setItem("theme", next ? "dark" : "light"); } catch { /* ignore */ }
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", next ? "#000000" : "#d62976");
  };
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b bg-card/90 backdrop-blur">
        <div className="mx-auto max-w-2xl px-4">
          <div className="relative">
            <h1 className="py-3 text-center font-logo text-3xl">OBWangnoi <span className="ig-text">OG</span></h1>
            <button onClick={toggleTheme} aria-label={dark ? "เปลี่ยนเป็นโหมดสว่าง" : "เปลี่ยนเป็นโหมดมืด"}
              className="absolute right-0 top-1/2 -translate-y-1/2 rounded-full border p-2 text-foreground hover:bg-muted">
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>
          <nav className="flex">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => setTab(id)}
                className={`flex flex-1 items-center justify-center gap-1.5 border-t-2 py-2.5 text-xs font-semibold tracking-wide transition sm:text-sm ${tab === id ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
                <Icon className="h-4 w-4" /><span>{label}</span>
              </button>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-4 py-5">
        {tab === "products" && <ProductsTab />}
        {tab === "records" && <RecordsTab />}
        {tab === "parties" && <PartiesTab />}
        {tab === "summary" && <SummaryTab />}
        {tab === "reconcile" && <ReconcileTab />}
      </main>
    </div>
  );
}
