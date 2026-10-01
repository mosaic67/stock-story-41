import { createContext, useContext, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export const ID_DOMAIN = "obwangnoi.app";
export const toEmail = (id: string) => `${id.trim().toLowerCase()}@${ID_DOMAIN}`;

type Me = { id: string; username: string; perms: string[]; isAdmin: boolean };
type Ctx = { ready: boolean; session: Session | null; me: Me | null; reload: () => void };
const AuthCtx = createContext<Ctx>({ ready: false, session: null, me: null, reload: () => {} });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [ready, setReady] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); if (!data.session) setReady(true); });
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const uid = session?.user.id;
    if (!uid) { setMe(null); return; }
    (async () => {
      const [{ data: p }, { data: r }] = await Promise.all([
        supabase.from("profiles").select("username, perms").eq("id", uid).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", uid),
      ]);
      setMe({ id: uid, username: p?.username ?? "", perms: p?.perms ?? [], isAdmin: !!r?.some((x) => x.role === "admin") });
      setReady(true);
    })();
  }, [session?.user.id, tick]);

  return <AuthCtx.Provider value={{ ready, session, me, reload: () => setTick((t) => t + 1) }}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);
