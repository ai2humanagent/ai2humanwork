# ai2human App Design Tokens

This token spec is for the app surfaces under `/browse`, `/humans/[id]`, and `/dashboard`.

## 1) Core colors

- `--ai2h-bg-0`: primary page background start.
- `--ai2h-bg-1`: mid background.
- `--ai2h-bg-2`: page background end.
- `--ai2h-surface-1`: panel gradient start.
- `--ai2h-surface-2`: panel gradient end.
- `--ai2h-border-soft`: default panel/input border.
- `--ai2h-border-strong`: focused/active nav border.
- `--ai2h-text-main`: main text color.
- `--ai2h-text-muted`: secondary text color.
- `--ai2h-brand-blue`: brand action blue.
- `--ai2h-brand-cyan`: brand support cyan.
- `--ai2h-brand-orange`: primary CTA orange.
- `--ai2h-success`: success / settled / available.
- `--ai2h-warning`: warning / attention state.

## 2) Layout and shape

- `--ai2h-radius-lg`: primary card radius.
- `--ai2h-radius-md`: controls/button radius.
- `--ai2h-shadow-soft`: panel depth shadow.

## 3) Component rules

- Panels use `surface` gradients + soft border.
- Primary CTA always uses orange gradient and dark text.
- Secondary CTA uses transparent navy surface and blue border.
- Status tags use green semantic styling (`success`).
- Active navigation uses blue/cyan background and strong border.

## 4) IA sections (current app)

- Browse: `Hero + Filters + Human Grid + Dispatch Rail`
- Human Detail: `Hero + Metrics Band + Execution Sections`
- Dashboard: `Verification Banner + Stats + Profile + Runtime Policies`

## 5) Do / Don't

Do:
- Reuse existing tokens before adding new colors.
- Keep component text contrast high on dark surfaces.
- Use one primary CTA per section.

Don't:
- Introduce random accent colors not mapped to a token.
- Use hardcoded hex colors in new app pages.
- Mix multiple CTA hierarchies in one row.
