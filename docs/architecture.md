# System Architecture Blueprint

## 1) Core Principles

- **Single source of truth:** PostgreSQL as the canonical transactional store.
- **Real-time synchronization:** event-driven updates between modules and client apps.
- **Auditability:** immutable audit log for all critical and regulated actions.
- **Security:** AES-256 at rest, TLS 1.3 in transit, MFA, granular RBAC, GDPR tooling.
- **Human-in-the-loop AI:** AI drafts documentation/invoices/reports; staff approval required before finalization.

## 2) High-Level Architecture

- **Frontend:** React + TypeScript web app, role-based views, live dashboard widgets.
- **Backend:** Node.js API (Express), domain modules for CRM, scheduling, inventory, billing, staff, e-commerce, communications.
- **Data layer:** PostgreSQL + Prisma ORM; Redis for cache/session/queue support.
- **AI layer:** transcription, diarization, NLP extraction, report generation, predictive models.
- **Integration layer:** eKasa, payments, SMS/email, labs, accounting exports, cloud object storage.
- **Observability:** metrics, traces, logs, alerting.

## 3) Domain Modules and Data Ownership

- **CRM module:** clients, pets, medical history, timeline.
- **Scheduling module:** appointments, rooms, equipment booking, waitlist.
- **Clinical documentation:** encounters, transcription artifacts, AI extraction drafts.
- **Inventory module:** products, stock levels, lots/expiry, reorders.
- **Billing module:** invoices, VAT, payment reconciliation, eKasa receipts.
- **Admin/staff module:** identity, shifts, permissions, compliance settings.

## 4) Event-Driven Cross-Module Flows

1. Vet prescribes medication → billing line draft + inventory reservation + patient timeline event.
2. Invoice approved → inventory deduction + medication labels + payment flow + accounting event.
3. Lab result abnormal → alert + follow-up task + notification + dashboard badge.
4. Appointment created/updated → reminders, staff allocation recalculation, resource lock updates.

## 5) AI Orchestration Pattern

- Capture stream (room microphone) -> transcription service -> extraction service -> draft artifacts.
- Route to clinician review queue.
- On approval, persist to EMR/invoice/inventory/logs.
- Keep provenance: transcript version, model metadata, approver, timestamps.

## 6) Compliance & Security Controls

- GDPR requests: export/delete workflow with legal hold checks.
- Data retention and archival policy (>5 years archival with restore support).
- Controlled substance tracking with discrepancy alerts.
- Audit logs searchable by actor/action/entity/time/IP.

## 7) Scalability & Reliability

- Horizontal API scaling behind load balancer.
- Read replicas for heavy analytics/reporting workloads.
- Queue-based async processing for AI and notifications.
- Backups every 6 hours + restore drills.
