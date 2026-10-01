import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toEmail } from "@/lib/auth";

export function LoginScreen() {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [id, setId] = useState("");
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^[a-zA-Z0-9_.-]{2,30}$/.test(id.trim())) return void toast.error("ไอดีใช้ a-z, 0-9, _ . - (2-30 ตัว)");
    if (pw.length < 6) return void toast.error("รหัสผ่านอย่างน้อย 6 ตัว");
    setBusy(true);
    const creds = { email: toEmail(id), password: pw };
    const { error } = mode === "in" ? await supabase.auth.signInWithPassword(creds) : await supabase.auth.signUp(creds);
    setBusy(false);
    if (error) toast.error(mode === "in" ? "ไอดีหรือรหัสผ่านไม่ถูกต้อง" : error.message.includes("registered") ? "ไอดีนี้มีผู้ใช้แล้ว" : error.message);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <form onSubmit={submit} className="w-full max-w-sm space-y-3 rounded-2xl border bg-card p-6">
        <h1 className="text-center font-logo text-4xl">OBWangnoi <span className="ig-text">OG</span></h1>
        <p className="text-center text-sm text-muted-foreground">{mode === "in" ? "เข้าสู่ระบบ" : "สมัครใช้งาน"}</p>
        <Input placeholder="ไอดี" autoCapitalize="none" autoComplete="username" value={id} onChange={(e) => setId(e.target.value)} />
        <Input placeholder="รหัสผ่าน" type="password" autoComplete={mode === "in" ? "current-password" : "new-password"} value={pw} onChange={(e) => setPw(e.target.value)} />
        <Button type="submit" className="w-full" disabled={busy}>{mode === "in" ? "เข้าสู่ระบบ" : "สมัคร"}</Button>
        <button type="button" onClick={() => setMode(mode === "in" ? "up" : "in")} className="w-full text-sm text-muted-foreground hover:text-foreground">
          {mode === "in" ? "ยังไม่มีไอดี? สมัคร" : "มีไอดีแล้ว? เข้าสู่ระบบ"}
        </button>
      </form>
    </div>
  );
}
