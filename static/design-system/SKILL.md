---
name: monesy-design
description: Use this skill to generate well-branded interfaces and assets for Monesy — Gestão Financeira, either for production or throwaway prototypes/mocks/etc. Contains essential design guidelines, colors, type, fonts, assets, and UI kit components for prototyping the Monesy web app and brand surfaces.
user-invocable: true
---

Read the `README.md` file within this skill, and explore the other available files.

If creating visual artifacts (slides, mocks, throwaway prototypes, etc), copy assets out and create static HTML files for the user to view. If working on production code, you can copy assets and read the rules here to become an expert in designing with this brand.

If the user invokes this skill without any other guidance, ask them what they want to build or design, ask some questions, and act as an expert designer who outputs HTML artifacts _or_ production code, depending on the need.

## Quick map

- `colors_and_type.css` — single source of truth for color, type, spacing, radii, shadows, light + dark themes. Import this in any HTML you produce.
- `assets/logos/` — 16 official mark / wordmark / lockup / app-icon SVGs. Use the actual file rather than redrawing.
- `ui_kits/web-app/` — React recreation of the Flask web app. Lift components or read them to match patterns.
- `preview/` — small specimen cards (palette, type, components). Useful as references when sizing typography or spacing.

## Brand essence in one breath

Nordic Trust + Brazilian Grit. Petroleum-teal primary (`#00ACC1`), champagne-gold accent used surgically (`#D4AF37`), cool grays. Two type families only: **Alte Haas Grotesk** (self-hosted from `fonts/`, brand face) + **JetBrains Mono** (mono used for every number, eyebrow, label). No illustrations. No emoji except as functional UI affordances. Sentence-case copy that talks to "você" like a friend who happens to do spreadsheets.
