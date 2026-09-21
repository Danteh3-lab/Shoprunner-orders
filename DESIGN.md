---
version: alpha
colors:
  primary: "#1C2434"
  surface: "#FFFFFF"
  canvas: "#F1F5F9"
  text: "#1C2434"
  muted: "#64748B"
  border: "#E2E8F0"
  selectionBackground: "#EFF6FF"
  selectionBorder: "#BFDBFE"
  selectionText: "#1E3A8A"
  focus: "#2563EB"
typography:
  body:
    fontFamily: "Inter, sans-serif"
    fontSize: "14px"
    lineHeight: "1.5"
  table:
    fontFamily: "Inter, sans-serif"
    fontSize: "13px"
    lineHeight: "1.4"
rounded:
  control: "8px"
  card: "12px"
spacing:
  control: "8px"
  section: "16px"
components:
  button:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.surface}"
    rounded: "{rounded.control}"
  table:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.card}"
    padding: "{spacing.section}"
  tableMeta:
    textColor: "{colors.muted}"
  tableDivider:
    backgroundColor: "{colors.border}"
  selectionBar:
    backgroundColor: "{colors.selectionBackground}"
    textColor: "{colors.selectionText}"
    rounded: "{rounded.control}"
    padding: "{spacing.control}"
  selectionOutline:
    backgroundColor: "{colors.selectionBorder}"
  focusRing:
    backgroundColor: "{colors.focus}"
  canvas:
    backgroundColor: "{colors.canvas}"
---

# Overview

Shoprunner Orders is a product surface for quickly scanning and updating customer orders. The visual language is a compact operations dashboard: familiar, quiet, and information-dense enough for repeated work. Existing runtime CSS variables are canonical; this file mirrors accepted values and records the rationale.

The memorable signature is the dark navy shell and restrained blue interaction state. The interface should never resemble a marketing landing page, a neon analytics product, or a decorative card gallery.

# Colors

The dark navy primary is reserved for high-confidence actions and the shell. White cards sit on the pale slate canvas. Muted slate text supports secondary metadata without competing with customer names and totals. The light blue selection surface is used only for the persistent bulk-selection bar and its associated focus/selection affordances.

# Typography

Inter is used throughout the dashboard. Body copy is 14px, table content is 13px, and labels are smaller only when the surrounding control makes their meaning explicit. Dates, money, weights, order identifiers, and statuses remain readable at normal zoom and are never conveyed by color alone.

# Layout

The dashboard uses a left navigation shell, a compact top header, and white rounded work surfaces inside a slate canvas. The order table is the canonical desktop representation; mobile switches to stacked order cards while preserving selection, actions, ordering, and full values. Standard controls use an 8px rhythm, with 12px/16px container spacing where the existing CSS establishes it.

# Elevation & Depth

Cards and table containers use the existing subtle shadow only to separate white work surfaces from the canvas. Borders carry most of the structure. Selection feedback is communicated with a light blue surface and border rather than a heavy glow.

# Shapes

Buttons, inputs, bulk bars, and order cards use the existing 8px control radius or 12px card radius. Selection controls remain native-looking square checkboxes with a visible keyboard focus ring.

# Components

The existing `.btn`, `.data-table`, `.order-card`, and custom checkbox styles are the shared component owners. The bulk offerte bar is a table-level toolbar variant: it shows an exact selected count, explains the two-order/same-customer constraints, and exposes `Create offerte` plus `Clear`. It does not introduce a new color system or a saved quotation state.

Runtime mapping is Model B: `styles/styles.css` owns the values. `DESIGN.md` mirrors `:root` values including `--primary-btn`, `--bg-white`, `--bg-main`, `--text-main`, `--text-muted`, `--border-color`, `--selection-bg`, `--selection-border`, `--selection-text`, and `--focus-color`.

# Do's and Don'ts

- Do keep bulk selection visibly tied to the current page, with an indeterminate page checkbox when only some visible rows are selected.
- Do preserve the existing dashboard density and use native button/checkbox semantics.
- Do keep printable offerte output separate from invoice/order persistence.
- Don't merge order data, recalculate historical prices, or introduce a database object for the quick version.
- Don't rely on hover-only text, browser `alert()` as the primary workflow feedback, or repeated totals that obscure the item-level table.
