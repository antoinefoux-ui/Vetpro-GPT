# Frontend Build Plan to Reach the Original Full Prompt

## Implemented now

- Auth UX: login, logout, password reset request/confirm, protected routes, runtime language switcher.
- Core module pages with live API integration: CRM, Appointments, Billing, Inventory.
- Scheduling page includes status transitions + room/equipment assignment action.
- Billing draft editor supports editing draft lines before approval (JSON MVP).
- Inventory includes purchase-order create/approve/receive workflows.
- Admin/compliance center: audit logs, role updates, permission matrix, GDPR request center, export package preview, delete impact check, settings editor.
- AI documentation page now reads draft queue and allows approve/reject actions.
- E-commerce page includes listing/filter/cart MVP flow.
- Cross-cutting baseline: reusable validation helpers, responsive layout, accessibility focus states/labels.
- Real-time baseline: polling across operations + SSE stream on dashboard.

## What is still left (full-scope gap)

### Clinical & CRM depth
- Pet medical sub-tabs (vaccinations, surgery, lab, imaging, chronic plans).
- Rich timeline filters/search/export and attachable documents.
- Visit note editor with private/shared note controls.

### Scheduling depth
- True calendar grid (day/week/month switcher with timeslots).
- Drag-and-drop rescheduling and multi-resource assignment matrix.
- Waitlist automation and no-show policy actions.

### Billing & payments depth
- Structured invoice line editor with pricing rules and discount engine.
- Split payments, refunds/credits, receivables aging dashboards.
- eKasa receipt lifecycle and VAT/tax reporting views.

### Inventory depth
- Lot/batch/expiry capture and receiving reconciliation details.
- Supplier scorecards, valuation and turnover analytics.

### AI documentation depth
- Real transcript ingestion/diarization chips tied to live encounters.
- AI draft diff tooling and confidence explanations.
- Report template customization and export bundles.

### E-commerce depth
- Full PLP/PDP, faceted filters, media gallery and reviews.
- Checkout journey with shipping/payment steps and order tracking.
- Subscription, loyalty, wishlist and returns workflows.

### Admin/compliance depth
- Staff profile management (licenses, certifications, shifts).
- GDPR legal-hold workflow and deletion approvals.
- Integration keys + notification template management depth.

## Cross-cutting still left

- Full WCAG 2.1 AA audit and remediation pass.
- WebSocket transport for collaborative real-time workflows.
- Schema-driven form system + shared error handling primitives.
- Executable E2E suite in CI (not only scenario list).
- Full EN/SK localization coverage across all screens.

## Next execution slices

1. **Clinical depth slice**: CRM medical tabs + full calendar grid + resource matrix.
2. **Financial depth slice**: invoice rule engine + split/refund flows + receivables reporting.
3. **Commerce/compliance slice**: full checkout funnel + staff credential center + GDPR legal-hold flow.
