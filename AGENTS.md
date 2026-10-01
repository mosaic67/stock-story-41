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
