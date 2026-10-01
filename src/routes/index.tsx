import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Package, ClipboardList, Store, BarChart3, Scale, Moon, Sun, Users, LogOut, Lock } from "lucide-react";
import { ProductsTab } from "@/components/ProductsTab";
import { RecordsTab } from "@/components/RecordsTab";
import { PartiesTab } from "@/components/PartiesTab";
import { ReconcileTab } from "@/components/ReconcileTab";
import { SummaryTab } from "@/components/SummaryTab";
import { UsersTab } from "@/components/UsersTab";
import { LoginScreen } from "@/components/LoginScreen";
import { AuthProvider, useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "OBWangnoi OG — จัดการสินค้าและยอดโอน" },
      { name: "description", content: "บันทึกสินค้า โอนสาขา ขายลูกค้าพิเศษ และสรุปยอดรายวัน รายเดือน" },
      { property: "og:title", content: "OBWangnoi OG" },
      { property: "og:description", content: "ระบบจัดการสินค้าคงคลัง โอนสาขา และสรุปยอด" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => <AuthProvider><Gate /></AuthProvider>,
});

const TABS = [
  { id: "products", label: "สินค้า", icon: Package },
  { id: "records", label: "บันทึก", icon: ClipboardList },
  { id: "parties", label: "คู่ค้า", icon: Store },
  { id: "summary", label: "สรุปยอด", icon: BarChart3 },
  { id: "reconcile", label: "กระทบยอด", icon: Scale },
  { id: "users", label: "ผู้ใช้", icon: Users },
] as const;
type TabId = (typeof TABS)[number]["id"];

function Gate() {
  const { ready, session, me } = useAuth();
  if (!ready) return <div className="flex min-h-screen items-center justify-center text-muted-foreground">กำลังโหลด…</div>;
  if (!session) return <LoginScreen />;
  if (!me) return null;
  return <App />;
}

function useSignOut() {
  const qc = useQueryClient();
  return async () => { await qc.cancelQueries(); qc.clear(); await supabase.auth.signOut(); };
}

function App() {
  const { me } = useAuth();
  const signOut = useSignOut();
  const allowed = TABS.filter((t) => me!.isAdmin || (t.id !== "users" && me!.perms.includes(t.id)));
  const [tab, setTab] = useState<TabId | undefined>(allowed[0]?.id);
  const [dark, setDark] = useState(false);
  useEffect(() => setDark(document.documentElement.classList.contains("dark")), []);
  useEffect(() => { if (!allowed.some((t) => t.id === tab)) setTab(allowed[0]?.id); }, [allowed, tab]);
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
            <button onClick={signOut} aria-label="ออกจากระบบ" className="absolute left-0 top-1/2 flex -translate-y-1/2 items-center gap-1 rounded-full border px-2 py-1.5 text-xs text-foreground hover:bg-muted">
              <LogOut className="h-3.5 w-3.5" />{me!.username}
            </button>
            <h1 className="py-3 text-center font-logo text-3xl">OBWangnoi <span className="ig-text">OG</span></h1>
            <button onClick={toggleTheme} aria-label={dark ? "เปลี่ยนเป็นโหมดสว่าง" : "เปลี่ยนเป็นโหมดมืด"}
              className="absolute right-0 top-1/2 -translate-y-1/2 rounded-full border p-2 text-foreground hover:bg-muted">
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>
          {allowed.length > 0 && (
            <nav className="flex">
              {allowed.map(({ id, label, icon: Icon }) => (
                <button key={id} onClick={() => setTab(id)}
                  className={`flex flex-1 items-center justify-center gap-1.5 border-t-2 py-2.5 text-xs font-semibold tracking-wide transition sm:text-sm ${tab === id ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
                  <Icon className="hidden h-4 w-4 sm:block" /><span className="whitespace-nowrap">{label}</span>
                </button>
              ))}
            </nav>
          )}
        </div>
      </header>
      <main className={`mx-auto max-w-2xl px-4 py-5 ${me!.isAdmin ? "" : "ro"}`}>
        {!allowed.length && (
          <div className="mt-16 flex flex-col items-center gap-3 text-center">
            <Lock className="h-10 w-10 text-muted-foreground" />
            <p className="font-semibold">ยังไม่ได้รับสิทธิ์เข้าใช้งาน</p>
            <p className="text-sm text-muted-foreground">กรุณาติดต่อ OBwangnoi by Dev</p>
          </div>
        )}
        {tab === "products" && <ProductsTab />}
        {tab === "records" && <RecordsTab />}
        {tab === "parties" && <PartiesTab />}
        {tab === "summary" && <SummaryTab />}
        {tab === "reconcile" && <ReconcileTab />}
        {tab === "users" && <UsersTab />}
      </main>
    </div>
  );
}
