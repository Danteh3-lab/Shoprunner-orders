# Workflow contract

## Source of truth

The bulk offerte behavior is defined by the user request for this feature. Existing order storage and invoice behavior are documented in [README.md](README.md) and remain unchanged.

## Canonical UI Map

| Capability | Canonical owner | Source of truth | Allowed variants | Verification |
|---|---|---|---|---|
| Table Selection | `order-selection.js` + Orders table | This contract and user request | List rows and mobile cards | `tests/quotation.test.js` |
| Select/Listbox | Existing native `select` controls | `styles/styles.css` and `index.html` | Browser-native popup | `tests/dashboard-modules.test.js` |
| Date | Existing native date/month controls | `index.html` and `app.js` | Browser-native picker | `tests/dashboard-modules.test.js` |
| Form | Existing order/team form patterns | `app.js` and `styles/styles.css` | Existing modal form | `tests/dashboard-logic.test.js` |
| CRUD | Existing Supabase data service | `scripts/dashboard/data-service.js` and README | Existing order/team CRUD | `npm test` smoke checks |

## Bulk offerte selection

- Page checkboxes select orders on the current page; selected orders remain selected while paging through the current filtered results.
- Changing search, owner filter, or date filter clears selection.
- Switching between list and grid views preserves selection.
- The header checkbox selects or clears all visible orders on the current page and becomes indeterminate for a partial page selection.
- The persistent bulk bar reports the exact count across the current filtered results and offers `Create offerte` and `Clear`.
- `Show order notes` is checked by default; turning it off omits all source-order notes from the printout.
- `Create offerte` requires at least two selected orders, and all selected orders must have the same customer name.

## Printable output

- The print document has one customer and one issue date.
- Each source order remains a separate section with its own items, item weights, shipping, handling rate, tax, notes, and existing subtotal.
- The grand total is the sum of the selected orders' existing totals.
- The quick version is print-only: it does not edit, merge, recalculate, save, or create database tables.

## Feedback and accessibility

Native checkboxes and buttons are used so keyboard selection remains standard. The bulk action is disabled until two orders are selected; same-customer validation still runs before printing. The visible helper text explains the current requirement, and the printable renderer escapes customer, order, note, item, and label content before inserting it into HTML.
