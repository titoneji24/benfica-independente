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

- Use the shared Crest component with the uploaded logo asset pointer for site branding so header and footer stay consistent; derive the public favicon from the same image.
- Keep numeric aggregates in get_match_results restricted to the caller's rated players; expose MOTM aggregates through a separate RPC so ranking cannot leak unassessed scores.
- Use shared voting helpers for confirmation/progress and ranking; persist each score independently via the existing unique-key upsert and store MOTM separately.
- Season ranking uses separate public counts/MOTM and authenticated privacy-gated averages RPCs, equal match weighting, July–June boundaries, and isolated demo fixtures; only closed-voting match winners earn awards, preserving ties.
- Ranking loads public data through a server-function-backed Query loader and user-scoped averages separately; sorting, minimum matches, season and dataset live in validated URL search parameters for shareable views.
