<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->
## Auth
- Login uses username mapped to synthetic email `<id>@obwangnoi.app`; why: org-internal app, no email.
- Writes allowed only for admin role via RLS; viewers get per-tab `profiles.perms`; UI hides `[data-edit]` under `.ro`.
- Audit log written by DB trigger `write_audit` on all data tables; why: no client code needed.
- Branch-to-branch transfers are transactions kind "branch_move" (branch_id = source, to_branch_id = destination, deduct_stock=false); why: reconcile subtracts from source and adds to destination without touching main stock.
- AI Hub API lives in src/lib/agent.server.ts (action registry) + src/routes/api/agent/*; why: one registry drives both tool schema listing and execution, writes need confirm:true.
