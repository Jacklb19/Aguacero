# Design notes

## Plan

- **One bold idea: the hyetograph.** Bars hang from the header's bottom rule on the home page.
  The same physics everywhere: rainfall, record counts and milliseconds all hang, and longer
  always means more (or slower). The logo mark, the empty state and the Open Graph image
  reuse it.
- **Palette: Andean páramo.** `fog` background, `basalt` text, `river` for every action and
  focus ring, `mora` only for warnings and peaks, `frailejon` only as a decorative fill.
  Flat, no gradients, no blur, no decorative shadows.
- **Type.** Bitter 700 for headings and inline key figures, Atkinson Hyperlegible Next for
  everything else, Atkinson Hyperlegible Mono only inside the SQL editor and code.
- **Layout.** Left-aligned, asymmetric, 72rem container. Prose at 68ch with sidenotes in the
  right margin from 1024 px (inline disclosures below that). No card grids: lists,
  definition lists, tables and tonal bands.
- **Motion.** One entrance on the home page (bars fall, `transform` only, 45 ms stagger).
  Everything else moves only in answer to an action. Reduced motion removes it.

## Self-critique against the anti-template checklist (README §5.13)

| Tell | Status |
| --- | --- |
| Cream + serif + terracotta | No: cool green-grey `fog`, slab serif, blue `river` |
| Near-black + acid accent | No: dark theme is a blue-green night (`#14232a`) |
| Broadsheet hairlines everywhere | Rules only where they group (table rows, header axis) |
| Grid of identical rounded cards | None; catalog is a list, home uses a definition list |
| Tracked caps eyebrows | None; sentence case everywhere, e2e test checks computed styles |
| Middle-dot meta strings, spaced em dashes | None; page titles use "Page \| Aguacero" |
| Monospace labels | Mono only in the editor and inline code |
| "→" in links | None |
| One accented word in a headline | None |
| 01/02/03 markers | None |
| Fade-and-slide on scroll, hover lift | None |
| Big-number stat tiles | Key figures are sentences with an inline Bitter figure |
| Tinted near-black for black | Not used |
| Stock shadcn | shadcn/ui was not installed: native `<select>`, `<details>`, and small custom controls cover every need, restyled to the tokens |
| More than one bold idea | Only the hyetograph |

### What changed after critique

- The first draft of the dataset page had three "key figure" blocks side by side. That was
  the stat-tile pattern, so they became three sentences.
- The render note first used a colored badge per pattern. It now reads as a plain sentence
  with a disclosure, because the badge added a second visual idea.
- Removed the decorative dots from the lab's freeze meter; it is a single bar on an axis.

## Deviations

- **Pale ramp classes and contrast.** YlGnBu classes 1-3 fall below 3:1 on `fog`. Every bar
  keeps its specified color but gets a 1 px inset edge at 40% `basalt`.
- **Dark ramp.** In dark mode the ramp runs from a muted blue to pale yellow, so "more" is
  still the stronger contrast against the dark background.
- **Input borders** use `line-strong` (`#8a9b93` light, `#6b8189` dark) instead of `line`,
  because `line` is below 3:1 against `paper` and inputs are UI components.
- **shadcn/ui not used.** Native elements met the needs with less code; nothing stock ships.

## QA status

- Styleguide at `/styleguide` renders tokens, type, controls, notes, table and hyetograph in
  both themes (the dark swatch set is a nested `data-theme="dark"` scope).
- Axe runs in `e2e/a11y.spec.ts` on every route in light and dark.
- Screenshots go to `docs/screenshots/` (see `e2e/screenshots.spec.ts`).
