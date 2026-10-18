---
name: CapeAI
description: A clear working document for vessel investment assumptions and cash flows.
colors:
  navy: "oklch(31% .041 218)"
  ink: "oklch(29% .035 214)"
  muted: "oklch(47% .025 207)"
  canvas: "oklch(96% .009 155)"
  paper: "oklch(99.5% .003 135)"
  tint: "oklch(93% .017 160)"
  line: "oklch(83% .019 165)"
  line-soft: "oklch(90% .012 165)"
  teal: "oklch(46% .075 171)"
  teal-light: "oklch(69% .065 170)"
  white: "oklch(100% 0 none)"
  danger: "oklch(44% .15 29)"
  danger-bg: "oklch(96% .018 29)"
  warning: "oklch(43% .085 65)"
  warning-bg: "oklch(96% .03 85)"
typography:
  headline:
    fontFamily: "-apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif"
    fontSize: "1.75rem"
    fontWeight: 650
    lineHeight: 1.22
    letterSpacing: "-.025em"
  title:
    fontFamily: "-apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif"
    fontSize: "1.1875rem"
    fontWeight: 650
    lineHeight: 1.3
    letterSpacing: "-.012em"
  section-title:
    fontFamily: "-apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif"
    fontSize: "1rem"
    fontWeight: 650
    lineHeight: 1.5
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  supporting:
    fontFamily: "-apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif"
    fontSize: ".8125rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "-apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif"
    fontSize: ".75rem"
    fontWeight: 600
    lineHeight: 1.5
  micro:
    fontFamily: "-apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif"
    fontSize: ".6875rem"
    fontWeight: 400
    lineHeight: 1.5
  button:
    fontFamily: "-apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif"
    fontSize: ".8125rem"
    fontWeight: 600
    lineHeight: 1.35
  input:
    fontFamily: "-apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.35
  metric:
    fontFamily: "-apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.5
    letterSpacing: "-.02em"
rounded:
  tag: ".25rem"
  field: ".3rem"
  control: ".375rem"
  compact: ".5rem"
  panel: ".75rem"
spacing:
  tight: ".25rem"
  small: ".5rem"
  medium: ".75rem"
  base: "1rem"
  wide: "1.25rem"
  group: "1.5rem"
  section: "1.75rem"
  major: "2rem"
  gutter: "clamp(1rem, 2.8vw, 2.5rem)"
  panel: "clamp(1.125rem, 2.4vw, 2rem)"
components:
  button-primary:
    backgroundColor: "{colors.teal}"
    textColor: "{colors.white}"
    typography: "{typography.button}"
    rounded: "{rounded.control}"
    padding: ".55rem 1rem"
  button-secondary:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.control}"
    padding: ".55rem 1rem"
  button-quiet:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.control}"
    padding: ".55rem 1rem"
  button-quiet-danger:
    backgroundColor: "transparent"
    textColor: "{colors.danger}"
    typography: "{typography.button}"
    rounded: "{rounded.control}"
    padding: ".55rem 1rem"
  input:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.input}"
    rounded: "{rounded.field}"
    padding: ".6rem .75rem"
    width: "100%"
  navigation:
    backgroundColor: "{colors.navy}"
    textColor: "oklch(92% .015 172)"
  study-tag:
    backgroundColor: "{colors.tint}"
    textColor: "{colors.teal}"
    typography: "{typography.micro}"
    rounded: "{rounded.tag}"
    padding: ".3rem .6rem"
  form-panel:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.panel}"
    padding: "{spacing.panel}"
  study-summary:
    textColor: "{colors.ink}"
  financial-table:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.compact}"
    width: "100%"
---
# Design System: CapeAI

## Overview

**Creative North Star: "Shipping manifest"**

The Shipping manifest world makes financial work feel like a clear, ruled working document. Navy navigation frames a mist-green canvas and warm-white work areas. Teal identifies actions and selection; compact system typography keeps attention on assumptions and their consequences.

The interface is dense enough for analysis while keeping labels, units, help and values separate. Conventional controls, restrained borders and tabular quantities carry the identity. The shipped visual assets are authored inline SVG marks, icons and financial geometry; there are no shipping raster assets or external font dependencies.

**Key Characteristics:**
- Ruled source-and-use pairs and aligned financial quantities.
- Warm-white work areas within a quiet green canvas.
- Conventional controls, explicit units and plain English.
- Intrinsic wrapping with local scrolling for wide financial data.

Recorded from `src/styles.css`, `src/app.mjs` and `index.html` on 18 October 2026. The selected world is recorded in `.impeccable/direction-contract.md` and `.impeccable/surfaces/index-html.md`; `PRODUCT.md` supplies the durable commitments to professional clarity, explicit assumptions and accessibility. Source CSS remains the implementation authority. `.impeccable/design.json` extends these primitives with states, responsive thresholds and component previews.

## Colors

The palette combines maritime navy, quiet green neutrals and a restrained teal action color. Frontmatter preserves the implemented OKLCH values.

### Primary

- **Working Teal (`teal`)** identifies primary actions, selected tabs, links, focus, positive table values and chart distributions.
- **Light Teal (`teal-light`)** makes focus visible against the navy navigation.

### Secondary

- **Warning Ochre (`warning`, `warning-bg`)** marks cautions and chart contributions. A contribution is a funding state, so the chart legend names it explicitly.
- **Validation Red (`danger`, `danger-bg`)** marks invalid inputs, written errors, destructive action text and negative table values.

### Neutral

- **Navigation Navy (`navy`)** grounds the navigation and toast. Selected navigation mixes this color with white (12%) in OKLCH.
- **Document Ink (`ink`)** is the main text; **Muted Ink (`muted`)** is supporting copy, units, table headings and chart labels.
- **Mist Canvas (`canvas`)**, **Warm Paper (`paper`)** and **Green Tint (`tint`)** separate the workspace, work panels and supporting/selected areas.
- **Rule (`line`)** and **Soft Rule (`line-soft`)** organize forms, summaries and table rows. **White (`white`)** is used on filled actions and the toast.

**The Meaningful Color Rule.** Use teal for actions, selection and distributions; use warning ochre for contributions and cautions, and danger red for validation or negative table values. Keep explanatory text beside color-coded states.

## Typography

**Body and interface font:** the system stack in `typography.body`. There is no separate display or monospaced face and no downloaded font. Headings use the same practical family; values use tabular numeral features rather than a different font.

### Hierarchy

- **Headline:** page titles; reduced at the compact-navigation threshold as recorded in the sidecar.
- **Title / Section title:** panel headings and subdivisions, using a shared semibold weight.
- **Body / Input:** root reading text and editable values. Inputs retain the body-size text on mobile.
- **Supporting:** introductory and explanatory text. Paragraphs are capped at (72ch).
- **Label / Micro:** field names, units, hints, save status and table annotations. Units use regular weight alongside a semibold label.
- **Button:** concise action labels; **Metric:** main return values. Summary values use (1.0625rem) at weight (600).

Headings balance their lines; general text wraps naturally. The brand wordmark is interface text at (1.5rem), weight (700), with tracking (-.03em).

**The Numeric Alignment Rule.** Use tabular numerals for financial quantities and right-align comparable table values. Preserve signs, currency and the stated cash-flow basis.

## Layout

The desktop shell uses a sticky toolbar with a minimum height of (4.5rem), a navy rail (13.75rem), and a flexible main area. Main content uses named grid tracks capped at (90rem), with the fluid gutter token on both sides. The main area's vertical padding is (2.25rem 4rem).

The setup area wraps naturally: the form grows from a minimum of `min(100%, 27rem)` and the summary starts from (15rem). Form fields and result metrics use `repeat(auto-fit, minmax(min(100%, 14rem), 1fr))`. Field gaps are (1.3rem) vertically and (1.25rem) horizontally. Repeated spacing steps are recorded in frontmatter; do not round the implemented fractional values into an invented scale.

At widths below (68rem), the rail narrows to (11.75rem), the brand description disappears, and the summary takes the full row with intrinsically fitting (12rem) minimum columns. Below (49rem), the toolbar becomes static, the rail becomes horizontally scrolling navigation, decorative navigation icons and its footer disappear, and the shell becomes one column. Inline editor rows move to two fields plus the remove action, with their third field on the next row. Below (25rem), toolbar actions take a full row and the form's primary continuation spans the available width.

Tabs can scroll horizontally. Tables preserve nowrap cells inside a labelled, focusable region. The chart preserves a minimum width of (32rem) in its own labelled, focusable region; table values and an SVG description provide its text equivalent. Mobile uses the same financial information and visible labels. Header and toast placement account for device safe-area insets.

**The Local Scroll Rule.** Let forms and summaries wrap to the available width. Preserve wide financial tables and chart geometry in their own keyboard-focusable scrolling regions.

## Elevation & Depth

Thin rules and surface tones provide depth in the working areas; panels and tables have no shadow. Only transient overlays cast shadows: a small shadow for the fixed toast and a larger shadow for the native modal dialog. The dialog also dims the page with a translucent backdrop. Exact values live in the sidecar's `shadows` and `backdrops` extensions.

**The Flat Work Surface Rule.** Keep work panels, tables and summaries flat. Reserve shadows for the toast and modal dialog.

## Shapes

The radius tokens distinguish small tags, fields, controls, compact containers and larger work panels. The shared panel radius also shapes the chart, library list and dialog. Borders are generally a single pixel; tables collapse their borders. The selected tab uses a straight underline (2px), and summary totals use a darker rule instead of a badge. Icons are open, round-ended SVG strokes (1.6) in a (24 × 24) view box and size with text (1.25em). Status/error dots are circles; chart bars use a small SVG corner radius (2).

## Components

### Buttons

Conventional and compact. Primary actions use teal and white; secondary actions use paper, ink and a rule border; quiet actions remove the filled surface and visible border. Destructive quiet actions use danger text. Shared minimum height is (2.75rem), with the padding, type and radius in frontmatter.

Fine-pointer hover adds tint to secondary/quiet buttons and darkens teal by mixing black (10%) into primary buttons. Pressed actions use `brightness(.9)`. Disabled controls use opacity (.5) and a not-allowed cursor. Focus uses a teal outline (3px) with an offset (3px), changing to light teal in the navy navigation. Background and filter transitions run for (160ms ease-out) only when reduced motion is not requested.

### Inputs / Fields

Visible labels lead; units sit beside them and specific help follows the input. Inputs, selects and textareas use paper, ink and a single rule border, with a minimum height of (2.75rem). Numeric fields use tabular figures. Textareas begin at (6rem) high and resize vertically. Invalid controls use a danger border and a written error linked through `aria-describedby`; no color-only validation is introduced. The normal keyboard focus outline is retained.

### Navigation / Tabs

The navy navigation uses text and authored SVG icons. The current page has a raised navy tone and white text. Setup tabs use muted text at rest, teal text when selected and a straight teal underline. Tabs expose selection, a controlled panel and arrow/Home/End keyboard navigation. Small red indicators flag steps containing errors; field-level text explains each error. Mobile navigation and tabs retain their labels while allowing local horizontal scrolling.

### Tags / Feedback

Study tags are small, noninteractive tinted labels such as “Synthetic example” or “Your assumptions.” Save status pairs text with a small colored dot. Notes use a tinted surface, with distinct warning and error variants. The toast is a polite live status region; written errors remain visible for longer than routine status messages. Replacement confirmation uses a native modal dialog and concrete actions: “Cancel,” “Continue without a copy” and “Save & continue.”

### Work Panels / Library

Paper panels use a soft rule, shared panel corners and fluid internal padding. Section intros and ruled actions group the work without nested card decoration. The device library groups entries in a single clipped panel with row dividers; actions wrap as space becomes scarce. Empty states explain what is absent and the next available action.

### Ruled Study Summary

Label/value pairs connect sources, uses and returns. Labels are muted; values are aligned with tabular figures. Initial equity is emphasized by an ink-colored top rule and label weight. The summary states its return basis and adds a written funding warning when extra equity is needed. Invalid studies show an explicit unavailable state rather than stale result values.

### Financial Tables / Chart

Tables are right-aligned, with left-aligned row headings, scoped header cells and captions. Tinted headers and totals organize the ledger; the active comparison row uses a light teal/paper mix. Hover is a mild tint/paper mix on fine pointers. Positive and negative values retain signs alongside their color.

The authored SVG chart shows distributions in teal and contributions in warning ochre, with written legend labels, a zero line, horizontal rules and a per-year text description. It uses real financial geometry rather than decorative graphics. Keep the chart and financial table values consistent.

## Do's and Don'ts

### Do:
- **Do** use sentence-case labels, visible units and specific help that explains how an assumption affects the model.
- **Do** pair invalid fields with written errors and keep unavailable results explicit.
- **Do** preserve semantic tables, captions, scoped headers and a text equivalent for the chart.
- **Do** use authored SVG icons with visible action labels or an accessible name for icon-only controls.
- **Do** keep selected states, keyboard focus and storage feedback visible.

### Don't:
- **Don't** introduce decorative imagery, marketing claims or ornamental display typography into this working interface.
- **Don't** shrink the whole page to fit wide financial tables; keep horizontal scrolling local to the data region.
- **Don't** replace actual financial states with a generic success score or a color-only investment verdict.
- **Don't** add card shadows or animated chart entrances to the flat working surfaces.
