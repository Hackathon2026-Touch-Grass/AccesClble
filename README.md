# Hackaton by the sea
## Contributers:
- Matthijs
- Aiden
- Lyam
- Luuk
- Marijn
- Thijs
- Twan
## AccesClble

# PortfolioMaestro
`composer install` Install dependencies\
`php maestro migrate` Get database working\
`php maestro serve` Run

# Accessibility gate

AccesClble compares your site against **its own history**, not just the ideal
WCAG standard. Existing debt is recorded in a committed baseline
(`.a11y-baseline.json`) and tolerated while it is phased out; anything **new**
is blocked. That way the tool can be adopted on a site with existing
accessibility debt without freezing development.

## Commands

| Command | What it does |
| --- | --- |
| `npm run check` | Run the gate (this is what CI runs). Fails only on violations that are new since the baseline. |
| `npm run check:report` | Same report, but never fails. Use this to look around before adopting the gate. |
| `npm run baseline` | Snapshot current violations on first run; afterwards it only **shrinks** the baseline (removes fixed debt). Refuses new debt. |
| `npm run baseline:accept-debt` | Explicitly accept new violations into the baseline. Deliberate escape hatch, visible in code review. |

The site must be running (`php -S localhost:8888 -t public`) so axe-core can
audit the pages listed in `a11y.config.json`.

## Adopting on a site with existing debt

1. `npm run check:report` — see the damage, nothing fails.
2. `npm run baseline` — lock today's debt in as the baseline; commit `.a11y-baseline.json`.
3. CI now blocks **regressions** only. Existing debt is reported as "known debt" and keeps passing.
4. Fix debt at your own pace. When the gate reports "Fixed since the baseline",
   run `npm run baseline` and commit — the ratchet tightens and that debt can never return.
5. When the baseline hits zero, switch `gate.mode` to `"strict"` in `a11y.config.json`.

## Violations vs warnings

Every finding lands in one of two categories:

- **Violations** — these block the pipeline. Anything axe-core rates
  critical/serious, plus every WCAG A/AA rule with direct legal exposure
  (ADA, EAA, Section 508): missing alt text, unlabeled form fields, color
  contrast, missing page language/title, etc.
- **Warnings** — everything else (axe-core moderate/minor). Reported so you
  can see them, but they never fail the build.

## Configuration (`a11y.config.json`)

- `gate.mode` — `"report"` (never block) → `"ratchet"` (block new violations only, the default) → `"strict"` (block all violations, even baselined ones).
- `checks.axeCore.urls` — the pages axe-core audits.

Each run also writes `a11y-report.json` (uploaded as a CI artifact), and the
baseline file keeps a history of every tighten/accept, so you can chart the
debt trend over time.



1. Clean state — npm run check → "No accessibility violations found. Accessibility gate: PASSED".

2. Introduce a regression — add this line inside the content block of index.html.twig:

<img src="/logo.png">
Run npm run check again → gate FAILS with two blocking violations, both tagged [violation] image-alt (one from the static file scan, one from axe auditing the live homepage). This is the anti-regression gate doing its job.

3. Try to sneak it into the baseline — npm run baseline → it refuses (exit 1): "The baseline only shrinks by default." That's the ratchet.

4. Accept it as legacy debt — npm run baseline:accept-debt → now npm run check passes again, listing the img under "Known debt, tolerated by the gate". This simulates adopting the tool on a site with existing debt: old problems don't block, but step 2 proved new ones would.

5. Pay the debt down — remove the <img> line, run npm run check → passes and reports "Fixed since the baseline (2)". Run npm run baseline → tightens back to 0 entries. If you re-add the same img now, it counts as new again — fixed debt can never quietly return.

6. Report-only mode — with any violation present, npm run check:report lists everything but always exits 0. That's the "phase 0" adoption mode.