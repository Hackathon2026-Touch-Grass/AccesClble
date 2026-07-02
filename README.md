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

## Severity ranking

Every violation is ranked `critical > serious > moderate > minor` (axe-core
impact) and categorised:

- **Legal blockers** — WCAG A/AA failures with direct legal exposure (ADA, EAA,
  Section 508): missing alt text, unlabeled form fields, color contrast,
  missing page language/title, keyboard traps, etc. These block the pipeline
  even below the severity threshold.
- **UX warnings** — the rest. Reported, but only block at or above
  `gate.failOn` severity.

## Configuration (`a11y.config.json`)

- `gate.mode` — `"report"` (never block) → `"ratchet"` (block new violations only, the default) → `"strict"` (block everything).
- `gate.failOn` — minimum severity that blocks (`"serious"` by default).
- `gate.blockLegalViolations` — legal blockers always block, regardless of severity (default `true`).
- `checks.axeCore.urls` — the pages axe-core audits.

Each run also writes `a11y-report.json` (uploaded as a CI artifact), and the
baseline file keeps a history of every tighten/accept, so you can chart the
debt trend over time.