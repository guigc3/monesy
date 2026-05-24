# Monesy — Design System

**Monesy · Gestão Financeira** is a Brazilian personal-finance web app: month-by-month
control of receitas, despesas, caixa disponível, assinaturas, lixeira and an Excel
import/export round-trip. Single Flask app (port 5001) + static frontend, three
storage backends (JSON dev / MySQL prod / Supabase legacy).

The visual identity is **"Nordic Trust + Brazilian Grit"**: Scandinavian
minimalism (cool grays, hairline rules, calm petroleum-teal) crossed with the
realism of someone tracking R$ down to the centavo. Champagne gold appears
surgically — premium accents, conquistas, never as the dominant color.

> *Estabilidade nórdica, segurança transparente.*

---

## Sources

| Source | Path / link |
|---|---|
| Manual da Marca v3.0 (PDF/HTML) | [`assets/Monesy-Manual-da-Marca-v3.html`](assets/Monesy-Manual-da-Marca-v3.html) — original at `uploads/Monesy - Manual da Marca (1).html` |
| Product codebase (Flask + static) | mounted local folder `monesy/` (read-only) |
| Brand logos | `monesy/logos/` — copied to `assets/logos/` |
| Production stylesheet | `monesy/static/style.css` — the single canonical token list |

If you don't have local access to `monesy/`, the Manual da Marca HTML in
`assets/` is the next best source of truth; everything in this kit is
reconciled with it.

---

## Index

| File / Folder | What's in it |
|---|---|
| [`README.md`](README.md) | This file — brand, content, visual & iconography foundations |
| [`SKILL.md`](SKILL.md) | Skill manifest (Agent SKills compatible) |
| [`colors_and_type.css`](colors_and_type.css) | All CSS variables — colors, type, spacing, radii, shadows, dark mode |
| [`assets/logos/`](assets/logos/) | Mark, wordmark, lockups, app icons (16 SVGs total) |
| [`assets/Monesy-Manual-da-Marca-v3.html`](assets/Monesy-Manual-da-Marca-v3.html) | Original 15-page brand manual |
| [`preview/`](preview/) | Cards that populate the Design System tab |
| [`ui_kits/web-app/`](ui_kits/web-app/) | React recreation of the Monesy web app (light + dark) |
| [`slides/`](slides/) | 1920×1080 sample slides using the brand manual's visual system |

---

## Brand essence

- **Nordic Trust** — elegância silenciosa, cálculo frio, sofisticação minimalista.
- **Brazilian Grit** — R$, vírgula decimal, dia 5, "labuta". Nada importado.
- **Maturidade** — fala com adulto. Sem condescendência, sem infantilizar.
- **Brasilidade** — gírias com cuidado, sempre "você", nunca "senhor".

---

## CONTENT FUNDAMENTALS

### Tone

Friend who happens to understand money. Short sentences. No jargon. If a
teenager doesn't get it, rewrite it. Always **honest** — show the whole bill
even when it stings; never sugarcoat. Always **optimistic** about what you can
do *today*, not about what scared you last month.

### Casing

- Sentence case everywhere — buttons, headings, modals, toasts.
- Monospaced labels (`.eyebrow`, `.card-label`, `.month-revisado-label`) are
  **UPPERCASE** with `letter-spacing: 0.10–0.14em`. These are the only
  uppercase moments in the system.
- Section eyebrows above titles: `Entradas`, `Saídas`, `Recorrentes`,
  `Relatório`, `Produto`. One or two words, never a full sentence.

### Pronoun & voice

- Always **"você"**. Never "senhor", "usuário", "cliente".
- "A gente" is OK when the brand is the speaker
  ("A gente organiza seus gastos do mês. Você só conta pra onde foi.").
- First-person plural reserved for genuine action by the brand.

### Currency, dates, numbers

- **R$** with a non-breaking space, always (`R$ 1.247,80`).
- Vírgula decimal (`,`), ponto de milhar (`.`). Never American format.
- Datas curtas em pt-BR: `12/03`, `dia 5`, `ag. 0001 · c. 12345-6`.
- Monetary values **always** rendered in `JetBrains Mono` — they're data, not prose.

### Emoji

Used sparingly, only as **functional affordances** inside the product, never as
decoration in marketing or brand assets:

- `📋` histórico de alterações
- `✏️` editar
- `🗑` excluir / lixeira / limpar mês
- `⬇` baixar / `⬆` importar
- Pago/investido row indicators rendered as small emoji at row-level.

Don't add emoji to slides, brand statements, or marketing copy — the Manual da
Marca contains zero.

### Examples (from the manual)

| Evitar | Preferir |
|---|---|
| "Otimize seu fluxo de caixa mensal através de categorização inteligente." | "A gente organiza seus gastos do mês. Você só conta pra onde foi." |
| "Saldo insuficiente para esta operação." | "Faltam R$ 12 pra essa. Quer remarcar pro dia 5, quando entra o salário?" |
| "Parabéns! Você atingiu sua meta de poupança." | "Você guardou R$ 500 este mês. É a primeira vez em 4 meses." |

Replace abstractions with **specific numbers**. Replace congratulation with
**observation**. Replace error-language ("insufficient") with **next steps**.

---

## VISUAL FOUNDATIONS

### Colors

Eight tokens, used in a strict **60 / 30 / 10** proportion:
60 % cool neutrals (Névoa, Papel, Cinza), 30 % petroleum-teal, 10 % champagne
gold. Gold is a scalpel — premium tiers, conquistas, the dot inside the "o" of
the wordmark, the up-arrow inside the mark. Never wallpaper.

| Token | Hex | Role |
|---|---|---|
| `--petrol` | `#00ACC1` | Primary — UI accents, links, primary buttons |
| `--petrol-deep` | `#006A75` | Header gradient, "investido" rows, dark surfaces |
| `--gold` | `#D4AF37` | Champagne accent — premium, awards, brand dot |
| `--gold-deep` | `#A88820` | Gold on light backgrounds, secondary accent |
| `--ink` | `#16191F` | Body text, graphite-mono variant |
| `--gray` | `#6B7280` | Secondary text, labels, monospaced eyebrows |
| `--cream` | `#F2F3F5` | Surface — panels, modal headers, secção titles |
| `--paper` | `#FAFAF9` | Page background, card surface, app shell |

Status colors (`--green #16a34a`, `--red #dc2626`) are saved exclusively for
positive/negative deltas and destructive actions.

### Typography

Two families. No third.

- **Alte Haas Grotesk** — display, headings, UI, body. Self-hosted from
  `fonts/AlteHaasGroteskRegular.ttf` (400) and `fonts/AlteHaasGroteskBold.ttf`
  (700). The 500 and 600 weights are mapped to Bold via `@font-face` (the
  family only ships two cuts) — never rely on the browser synthesizing a
  semi-bold. Tight tracking on display (`-0.04em`); slightly less tight on
  body (`-0.01em`).
- **JetBrains Mono** — money, IDs, dates, eyebrows, all-caps labels. Loaded
  from Google Fonts (weights 400, 500, 600). Letter-spacing `0.10em` for
  uppercase labels.

The pairing carries the system's tension: Grotesk is friendly + Scandinavian,
Mono is the "ledger" — every number you see in the app is mono.

### Spacing

4 px base scale (`--space-1` to `--space-12`). Cards use `padding: 20px 22px`,
panels `16px 20px`. Generous breathing room between sections (`margin-bottom:
24px`). Mobile tightens by ~20 %.

### Backgrounds

- **No imagery in the app.** Everything is solid surfaces + 1 px hairline.
- The brand manual uses one full-bleed gradient (`#00ACC1 → #006A75`) for the
  app header and card frontside. Otherwise solid blocks.
- Cards use **very subtle 160°-angle linear gradients** from a 6–12 % tinted
  corner into `--paper` — almost imperceptible, just enough to give entrada /
  saída / caixa / pendente cards distinct identities without color shouting.
- No textures. No noise. No hand-drawn illustrations. No emoji-as-background.

### Animation

- All transitions are short and quiet — `0.15s ease` for hover, `0.18s ease`
  for tab actives, `0.22s cubic-bezier(0.34, 1.56, 0.64, 1)` for modal entry
  (single point of spring; everything else is plain ease).
- `fadeUp` keyframe on panels (`translateY(10px) → 0`, `opacity 0 → 1`, 0.3 s).
- No bounces, no rotations, no parallax. Movement is functional.

### Hover & press states

- **Buttons (primary):** `filter: brightness(1.07)` + bigger `--primary-glow` shadow.
- **Buttons (ghost):** background fades to `--primary-soft`.
- **Cards:** border shifts from `--line` to `rgba(0,172,193,0.35)` + `--shadow-xs`.
  No translate, no scale.
- **Rows:** `tr:hover td { background: var(--primary-soft); }`.
- **Press:** no explicit press state (no shrink, no darker color). Active state
  is the *result* — e.g., a paid row going line-through + 0.6 opacity.
- **Focus:** `0 0 0 3px var(--primary-glow)` ring + petrol border. Visible, never garish.

### Borders & rules

- All cards, panels, modals: `1 px solid var(--line)` (#DDE0E5).
- Inside content: `border-bottom: 1 px solid var(--border-soft)`
  (rgba 7 % black) — even softer.
- Modal headers have a `3 px top border` in `--primary` — the only "accent
  bar" pattern in the system. The chart panel has the same in `--gold`.
  No left-border accent bars.

### Shadows

A 4-step scale, all cool ink:
`--shadow-xs` (1 px ambient) → `--shadow-sm` (8 px) → `--shadow` (20 px) →
`--shadow-lg` (40 px). Primary buttons use a colored glow
(`--primary-glow`) instead of a generic drop shadow. No inner shadows. No
multi-layer shadows.

### Radii

`--radius-sm 10px` (buttons, inputs, chips) · `--radius 12px` (cards, panels) ·
`--radius-lg 16px` (modals) · `--radius-pill 999px` (badges, tags). The brand
mark itself uses `rx="6"` on the columns and `rx="22"` on app-icon containers
— consistent with the "soft rectangle" feeling.

### Transparency & blur

- Header buttons live on `rgba(242,243,245,0.10)` over the petrol gradient.
- Modal backdrop: `rgba(22,25,31,0.55)` + `backdrop-filter: blur(4px)` — the only
  blur in the system.
- Tag chips & badges: 10 % primary/accent fill with 22–25 % border, no blur.

### Cards

Three layers:
1. `background: var(--paper)` with the subtle gradient overlay token
   (`--card-entrada-bg`, `--card-saida-bg`, etc.)
2. `border: 1 px solid var(--line)`
3. Top edge: a `3 px ::before` colored bar (petrol, red, gold, etc.) — the
   only colored stripe in the system.

No drop-shadow at rest. On hover, the border tints petrol and `--shadow-xs`
appears.

### Layout

- Container is `max-width: 1240 px` with `padding: 28 px 24 px 60 px`.
- Sticky header (`position: sticky; top: 0; z-index: 100`) is the only fixed
  element in the app.
- Grid: 12-column conceptually; in practice five-up summary cards, then a
  `1fr 1.25fr` split for Receitas / Despesas panels.

### Imagery vibe

Cool. Calm. There's almost no photography in the system — when there is (e.g.,
sample card mockup in the manual), it's the **card itself** as a graphic:
linear gradient + the mark, nothing else. If photography is added later, it
should be warm-cool, low-contrast, no grain, never tropical / vibrant Brazil
clichés.

---

## ICONOGRAPHY

Monesy does **not** ship a custom icon font or SVG sprite. The codebase uses
three sources of glyphs, in this order of preference:

1. **The brand mark** (`assets/logos/monesy-mark*.svg`) is hand-placed wherever
   the brand needs to appear — header, favicon, auth screen, app icon, card
   mockups. It is never recolored outside the official 6 variations.
2. **Inline emoji** as functional affordances inside the product UI only:
   `📋` history · `✏️` edit · `🗑` trash / clean / lixeira · `⬇` download ·
   `⬆` upload. Always at body-text size, no decorative use.
3. **Unicode glyphs** for tiny inline marks: `+` (add), `×` (close),
   `&times;` (delete-year button), `↑ ↓` (sort), `R$` (currency).

**For new product work / prototypes,** substitute the **Lucide** icon set
(matching weight, rounded line, 24 px default) from
`https://unpkg.com/lucide@latest`. Lucide's neutral, hair-line aesthetic
matches the Nordic-Trust palette better than Heroicons / Material. Flag the
substitution in any deliverable.

⚠ **Substitution flagged:** Lucide is *not* in the production codebase yet.
If you ship Lucide-laden mocks back to the engineering team, mention it.

No illustrations, no spot illustrations, no isometric drawings, no stickers.
The brand mark + a number on a card is the visual.

---

## Fonts

The system ships with both required families resolved:

| Family | Source | Files / weights |
|---|---|---|
| **Alte Haas Grotesk** | Brand team upload — `fonts/AlteHaasGroteskRegular.ttf`, `fonts/AlteHaasGroteskBold.ttf` | 400 + 700 only; 500 & 600 mapped to Bold via `@font-face` |
| **JetBrains Mono** | Google Fonts (`@import` in `colors_and_type.css`) | 400 / 500 / 600 |

> The brand manual originally specified **Space Grotesk** as a stand-in; the
> uploaded Alte Haas Grotesk is the real brand face and now drives `--font-sans`.
> Any earlier mocks or reconstructions made before the upload still use Space
> Grotesk metrics — flag for design review if pixel-fidelity matters.

---

## Caveats / open items

- Logo variants beyond `monesy-mark.svg` and `monesy-mark-on-dark.svg` were
  **regenerated** from the geometric spec in the manual (same coordinates, same
  proportions, recolored). The wordmark and lockups are reconstructions: now
  set in **Alte Haas Grotesk Bold** (the uploaded brand face), but the
  letter-spacing values come from the manual's Space Grotesk specification —
  worth a quick eye-check from the type designer.
- Marketing site, mobile app, docs — none exist in the codebase. The only
  product surface is the Flask web app, so there's exactly one UI kit.
- Brand manual page 4 mentions the gold coin appears inside the "o" of the
  wordmark only at sizes > 32 pt; the reconstructed wordmark follows this.
