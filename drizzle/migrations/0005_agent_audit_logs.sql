CREATE TABLE public.agent_audit_logs (
  id bigserial PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  action text NOT NULL,
  params jsonb,
  status text NOT NULL,
  error text
);
GRANT SELECT ON public.agent_audit_logs TO authenticated;
GRANT ALL ON public.agent_audit_logs TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.agent_audit_logs_id_seq TO service_role;
ALTER TABLE public.agent_audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read agent logs" ON public.agent_audit_logs FOR SELECT TO authenticated USING (public.is_admin());