# Web app UI kit · Monesy

A click-thru React recreation of `monesy/static/index.html`. Mirrors the real
product structure: a JWT login overlay, then a three-tab shell (**Gastos
mensais**, **Assinaturas**, **Features**) under a sticky petrol-gradient
header.

## What works

- **Login → Dashboard:** any credentials accept; lands on the Gastos view.
- **Month tabs:** click to switch month; checkbox below marks "revisado".
- **Light ⇄ Dark theme:** toolbar toggle, applies `data-theme="dark"` from
  `colors_and_type.css`.
- **Pago / Investido checkboxes:** flip a row to paid (line-through, faded)
  or investido (italic petrol-deep, tinted background). Recomputes the five
  summary cards instantly (mirrors `refreshCaixaFromState` from the codebase).
- **+ Novo lançamento:** opens the modal; saving appends the row to the right
  panel and fires a toast.
- **Tag chips:** type + Enter to add; × to remove. Same petrol-soft pill style
  as the production app.
- **Tabs:** Assinaturas tab shows the recorrentes table with ativa/encerrada
  badges; Features tab shows the chronological list.

## Components

| File | What |
|---|---|
| `App.jsx` | Top-level state + view router |
| `Header.jsx` | Sticky petrol-gradient header + `AppTabs` |
| `MonthTabs.jsx` | 12-month segmented control with revisado checkboxes |
| `SummaryCards.jsx` | Entrada / Saída / Caixa / A pagar / Orçamento |
| `AnnualChart.jsx` | Pure-SVG bar+line chart (Chart.js stand-in) |
| `LancamentosPanel.jsx` | Receitas or Despesas, grouped by seção |
| `SecondaryViews.jsx` | `AssinaturasView`, `FeaturesView` |
| `NovoLancamentoModal.jsx` | Add-lançamento dialog with tags |
| `AuthScreen.jsx` | Login overlay |
| `data.jsx` | Mock data + `fmtBRL`, `fmtNum`, `MONESY_MARK` helpers |
| `app.css` | Stripped, design-systemified copy of `monesy/static/style.css` |

## Things the kit deliberately fakes

- No actual API / JWT — login accepts anything.
- Annual chart is a hand-rolled SVG; production uses Chart.js 4.4.
- Histórico modal, Lixeira modal, Excel import, year-management modals exist
  in the real app but are out of scope for the kit (button hooks are still
  there cosmetically).
- The Manual da Marca card mock (debit card, app icons) lives in `preview/`
  brand cards, not here.

## Provenance

All visuals reconciled against:

- `monesy/static/style.css` — the canonical token list
- `monesy/static/index.html` — the DOM scaffold
- `assets/Monesy-Manual-da-Marca-v3.html` — typographic + color rules
