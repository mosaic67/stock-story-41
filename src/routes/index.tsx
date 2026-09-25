import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Package, ClipboardList, Store, BarChart3 } from "lucide-react";
import { ProductsTab } from "@/components/ProductsTab";
import { RecordsTab } from "@/components/RecordsTab";
import { PartiesTab } from "@/components/PartiesTab";
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
  { id: "records", label: "บันทึกรายการ", icon: ClipboardList },
  { id: "parties", label: "สาขา", icon: Store },
  { id: "summary", label: "สรุปยอด", icon: BarChart3 },
] as const;

function Index() {
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("products");
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b bg-card/90 backdrop-blur">
        <div className="mx-auto max-w-2xl px-4">
          <h1 className="py-3 text-center font-logo text-3xl">OBWangnoi <span className="ig-text">OG</span></h1>
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
      </main>
    </div>
  );
}
