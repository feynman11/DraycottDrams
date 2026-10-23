# UX audit — October 2026

Reviewed every public route at 390×844 (mobile), 820×1180 (tablet) and 1440×900 (desktop) with
Playwright, plus the signed-in surfaces (members page, admin tabs, sommelier panel, detail panels)
by reading the source. Findings are grouped by theme; each one says what is wrong and what the
`ux/2026-refresh` branch does about it.

## 1. Visual design

| Finding | Where | Fix |
| --- | --- | --- |
| No design tokens in use. `styles/globals.css` defines the stock shadcn slate palette in HSL, but every component hard-codes `bg-slate-900/950`, `border-slate-800`, `text-amber-400` etc. (300+ occurrences). The `.dark` block is dead: `index.html` sets `class="dark"` but nothing reads `bg-background`. | `styles/globals.css:3-46`, all of `components/` | Replace the theme with semantic OKLCH tokens (`background`, `card`, `muted`, `accent`, `primary`, `border`, `muted-foreground`, status colours, podium gold/silver/bronze), a radius/shadow scale, a type scale and motion tokens. Components use only token utilities; the slate/amber classes go. |
| Cold blue-black surfaces (`slate-950` = navy) fight the amber identity. | every page wrapper (`src/pages/*.tsx`) | Warm charcoal surfaces (hue ≈ 60, very low chroma) in three elevation steps, amber kept as a single restrained accent. |
| Three competing amber/orange/yellow gradients (`from-amber-500 via-yellow-400`, `from-amber-700 to-orange-700`, `from-amber-900 to-slate-900`) and a 3 px gradient bar on *every* card, including unranked ones. | `whisky-card.tsx:22-30`, `distillery-card.tsx:25-31`, `winners-circle.tsx:314`, `whisky-detail.tsx:32-40` | One accent treatment per rank (gold/silver/bronze tokens); unranked cards get no stripe. Gradients only in the detail-panel hero. |
| Rainbow status icons (blue calendar, green building, purple users) in stat cards with no meaning. | `winners-circle.tsx:55-75`, `my-results.tsx:56-97`, `data-issues.tsx:59-127` | A shared `StatCard` with one icon colour (muted) and the value as the focal point. |
| `font-serif` falls back to Times in the detail hero ("12yo" renders in Times New Roman). | `whisky-detail.tsx:61`, `map-visualization.tsx:735` | Add Instrument Serif (one 147 KB @fontsource package, ~20 KB loaded) as `--font-display` for page titles and panel heroes. |
| Empty region renders an empty amber pill. | `distillery-card.tsx:47` (Nikka, Midleton, Bushmills) | Badge only renders when there is a region. |

## 2. Layout and responsiveness

| Finding | Where | Fix |
| --- | --- | --- |
| **Tablet (820 px) horizontally overflows.** The `md:` desktop nav turns on at 768 px but brand + subtitle + four labelled links + divider + sign-in need ~900 px; "Winners" is clipped and "Sign In" is off-screen. | `header.tsx:25-134` | Compact header: subtitle hidden below `lg`, tighter link padding, avatar menu instead of an inline sign-out button. Verified at 820 px. |
| Every page is `h-screen overflow-hidden` with an inner `overflow-y-auto` div, so the document never scrolls: mobile browsers can't collapse their URL bar, pull-to-refresh fights the inner scroller, and `100vh` under-reports on iOS. | `src/pages/*.tsx`, `whisky-library.tsx:157`, `winners-circle.tsx:36` | One `AppShell` with a sticky header and a normally scrolling `<main>`; only the map page pins its height (`100dvh`). |
| Mobile filter rows are a wrap of fixed-width selects (`All Regions` wide, `All Gatherings` narrow, `No Grouping` medium) giving a ragged stack. | `whisky-library.tsx:171-261`, `distillery-list.tsx:168-245`, `winners-circle.tsx:113-139` | A `FilterBar` grid: search full-width, selects `grid-cols-2` on mobile, inline on `md+`, consistent 40 px control height. |
| Admin tables are plain `<table>` in an `overflow-x-auto` div with no scroll affordance; edit forms are two-column grids even at 390 px. | `members-management.tsx:285`, `library-management.tsx:286`, `distillery-management.tsx:281`, `gatherings-management.tsx:126`, `drams-sheet.tsx:169` | `TableScroll` wrapper with edge fades; form grids collapse to one column below `sm`. |
| Detail panels are `absolute inset-y-0 right-0` inside the page, so they only cover the page body, don't trap focus, don't close on Escape, and on mobile the header stays visible above them. | `whisky-detail.tsx:23`, `distillery-detail.tsx:66` | A `Sheet` primitive on Radix Dialog: portal, focus trap, Escape, overlay, full-screen below `md`, 480 px side panel above. |
| Podium (`w-24`/`w-28` fixed columns, three across) can't fit 390 px with margins. | `gathering-podium.tsx:40-82` | Fluid columns with `min-w-0`. |

## 3. Navigation and information architecture

| Finding | Where | Fix |
| --- | --- | --- |
| Nav links are hand-copied five times for desktop and five times for mobile, with five `isXPage` booleans. | `header.tsx:18-22, 41-99, 150-214` | One `NAV_ITEMS` array (`to`, `label`, `icon`, `requires`) rendered by the header and the mobile bar; active state from `useLocation`. |
| Mobile navigation is a hamburger dropdown that covers content with no backdrop, no focus management, and no Escape handling. | `header.tsx:136-241` | **Bottom tab bar** on `< md` (justification below) plus an avatar/sign-in menu in the header. |
| `/members` when signed out renders a bare "Management" heading with one "Drams Sheet" tab and an empty body. | `src/pages/members.tsx:85-205` | A sign-in prompt state; the tab list is a config array with `visible` predicates. |
| The "View on map" button in the whisky detail hero has no handler. | `whisky-detail.tsx:44-49` | Removed (a dead control is worse than none; wiring it is a behaviour change out of scope). |

Why a bottom tab bar rather than a drawer: the app has four public destinations (five for members), all equal in
weight and all browsed repeatedly; a persistent bar keeps them one thumb-tap away with a visible active state,
which a hamburger hides behind two taps. The AI button and map controls move up by the bar's height so nothing
overlaps, and the bar respects `env(safe-area-inset-bottom)`.

## 4. Interaction and feedback states

| Finding | Where | Fix |
| --- | --- | --- |
| Loading is a text string ("Loading whisky library...", "Loading Map...") or a bare spinner, so the layout jumps when data arrives. | `whisky-library.tsx:147`, `whisky-map.tsx:77`, `distillery-list.tsx:136`, `winners-circle.tsx:142`, every admin component | `Skeleton` primitive; list pages render skeleton cards in the real grid; tables render skeleton rows. |
| Error state is a red string or nothing (`whisky-map.tsx:85`); most queries ignore `error` entirely. | all list components | `EmptyState` with an icon, message and a retry/clear action; the map shows a retry. |
| Clickable cards are `<div onClick>`: not focusable, not in the tab order, no keyboard activation. | `whisky-card.tsx:13`, `distillery-card.tsx:16` | Cards render as `<button>` with `focus-visible` rings and a pressed state. |
| Hover feedback is inconsistent: some buttons change colour, some scale (`hover:scale-105`), cards change border only. | `gathering-podium.tsx:147`, `ai-button.tsx:12` | Motion tokens: 150 ms colour, 200 ms translate-y lift on cards, no scale transforms. |
| Mutations show a spinner inside the button but the list refetches silently; destructive actions have an inline "Confirm" with no explanation. | admin management components | Keep the inline confirm but label it ("Delete?"), disable siblings while pending, and keep the row height stable. |
| The sommelier panel is a 384 px-tall box that doesn't scroll to the newest message, and messages have no max width on mobile. | `sommelier-panel.tsx:82-134` | A right-side sheet (full-screen on mobile), auto-scroll to latest, assistant/user bubbles with tokens, Enter to send, Shift+Enter newline. |

## 5. Accessibility

| Finding | Where | Fix |
| --- | --- | --- |
| Icon-only buttons rely on `title` or have nothing: map zoom/reset/filter/legend, close buttons, edit/delete, send. | `map-visualization.tsx:742-947`, `whisky-detail.tsx:25`, `sommelier-panel.tsx:94,148`, admin tables | `aria-label` on every icon button via a shared `IconButton` usage of `Button size="icon"`. |
| No `<main>` landmark on the map page body; header `<h1>` is the brand on every page, so page titles are `<h2>`. | `src/pages/*.tsx` | `AppShell` renders `<header>`, `<main>`, `<nav aria-label>`; page titles are the `<h1>`, the brand is a link. |
| Text contrast failures: `text-slate-500` on `slate-950` (4.1:1) for labels, `text-slate-600` (2.6:1) for separators and "whiskies" counts, `text-amber-400/70`. | cards, tables, `winners-circle.tsx:344` | Token scale where `muted-foreground` is ≥ 7:1 and `foreground-subtle` ≥ 4.6:1 against their surfaces. |
| `focus-visible` rings use `ring-ring` = near-black on a dark UI (invisible). | `components/ui/button.tsx:8` | `ring` token is amber; `ring-offset` is the surface colour. |
| No `prefers-reduced-motion` handling (`animate-pulse`, `animate-bounce`, `hover:scale`). | `globals.css`, several components | A global reduced-motion rule and transitions expressed through motion tokens. |
| Touch targets below 44 px: map mobile reset button (`p-1.5` on a 16 px icon = 28 px), close buttons (`p-1`), table action buttons (`h-9`). | `map-visualization.tsx:1136`, `sommelier-panel.tsx:96` | Minimum 40 px icon buttons, 44 px on touch (`@media (pointer: coarse)`). |
| Native `<select>`s render light in some browsers because `color-scheme` is never set. | `globals.css` | `color-scheme: dark` on `:root`. |

## 6. Consistency

| Finding | Where | Fix |
| --- | --- | --- |
| Six different input/select class strings (`px-4 py-2 bg-slate-800 …`, `px-3 py-2 bg-slate-900 …`, `px-2 py-1.5 …`). | every form | `Input`, `Textarea`, `Select`, `Label` primitives. |
| Three tab implementations (underline tabs on members, pill tabs on winners, card tabs on data issues/AI review). | `members.tsx`, `winners-circle.tsx:273`, `data-issues.tsx:50`, `ai-review.tsx:115` | One `Tabs` primitive (underline, keyboard-navigable) and `OptionCard` for the choose-one cards. |
| Ranking colours re-derived in five places (`ranking-badge.tsx`, `whisky-card.tsx`, `whisky-detail.tsx`, `gathering-podium.tsx`, `provider-leaderboard.tsx`). | as listed | `rankTone(ranking)` in `ranking-badge.tsx` returns the token classes; everything imports it. |
| Page headers differ per page (icon + title, title + count, title only). | all pages | `PageHeader` with `title`, `description`, optional `aside`. |
| Dead code: `my-tastings.tsx`/`tasting-form.tsx` and `gathering-podium.tsx` are not imported anywhere; `PodiumBadge` is imported but unused; `tailwind.config.ts` is ignored by Tailwind 4 (no `@config`). | — | Restyled with tokens so they are consistent if revived; `tailwind.config.ts` deleted. Deleting the unused components is left for the PM to decide. |
