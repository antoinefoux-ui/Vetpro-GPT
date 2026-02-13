# VetPro GPT - AI-Powered Veterinary Practice Management Platform

VetPro GPT is a full-stack monorepo for building a modern veterinary practice management platform with integrated AI workflows.

## Delivered in this iteration (first 6 priorities)

1. **Repo hardening + CI**
   - Root npm workspace setup (`apps/api`, `apps/web`)
   - `.env.example` files for API and web
   - GitHub Actions CI pipeline for build/test
2. **Auth + RBAC + users/staff access controls**
   - Register/login/me endpoints
   - Bearer-token auth middleware
   - Permission-based authorization matrix
3. **CRM core**
   - Create/list clients
   - Create pets linked to client household
4. **Scheduling core**
   - Create/list appointments
   - Double-booking prevention for veterinarian conflicts
5. **Billing core**
   - Create invoice drafts
   - Approve invoices with VAT totals
6. **Inventory core flow**
   - List inventory
   - Manual stock adjustment
   - Automatic stock deduction on invoice approval + low-stock alerts

## Monorepo layout

```txt
apps/
  api/  Node.js + Express + TypeScript
  web/  React + TypeScript (Vite)

docs/
  architecture.md
  implementation-roadmap.md
  frontend-plan.md
```

## Quick start

### 1) Infrastructure

```bash
docker compose up -d
```

### 2) Configure environment

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
```

### 3) Install dependencies

```bash
npm install --workspace apps/api
npm install --workspace apps/web
```

### 4) Run API / web

```bash
npm run dev --workspace apps/api
npm run dev --workspace apps/web
```

## API quick walkthrough

### Auth

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `POST /api/auth/password-reset/request`
- `POST /api/auth/password-reset/confirm`
- `GET /api/auth/me`

### CRM

- `GET /api/crm/clients`
- `GET /api/crm/clients/:id`
- `GET /api/crm/clients/:id/timeline`
- `POST /api/crm/clients`
- `POST /api/crm/pets`

### Scheduling

- `GET /api/appointments/calendar`
- `POST /api/appointments/calendar`
- `PATCH /api/appointments/calendar/:id/status`
- `PATCH /api/appointments/calendar/:id/resources`

### Billing

- `GET /api/billing/invoices`
- `POST /api/billing/invoice-drafts`
- `PATCH /api/billing/invoice-drafts/:id`
- `POST /api/billing/invoices/:id/approve`
- `POST /api/billing/invoices/:id/pay`

### Inventory

- `GET /api/inventory/items`
- `GET /api/inventory/alerts`
- `POST /api/inventory/items/:id/adjust`
- `GET /api/inventory/purchase-orders`
- `POST /api/inventory/purchase-orders`
- `POST /api/inventory/purchase-orders/:id/approve`
- `POST /api/inventory/purchase-orders/:id/receive`

### AI

- `POST /api/ai/encounters/:id/transcribe`
- `GET /api/ai/drafts`
- `PATCH /api/ai/drafts/:id`

> Most endpoints require `Authorization: Bearer <token>`.


### Admin

- `GET /api/admin/system-health`
- `GET /api/admin/audit-logs?limit=100`
- `GET /api/admin/permissions`
- `GET /api/admin/staff`
- `PATCH /api/admin/staff/:id/role`
- `GET /api/admin/gdpr-requests`
- `POST /api/admin/gdpr-requests`
- `PATCH /api/admin/gdpr-requests/:id/status`
- `GET /api/admin/gdpr-export/:clientId`
- `GET /api/admin/gdpr-delete-check/:clientId`
- `GET /api/admin/settings`
- `PATCH /api/admin/settings`


## Frontend planning tracker

- UI route: `/frontend-plan`
- Detailed delivery doc: `docs/frontend-plan.md`

## Frontend module routes (implemented foundations)

- `/login`
- `/dashboard`
- `/crm`
- `/appointments`
- `/billing`
- `/inventory`
- `/ai-docs`
- `/ecommerce`
- `/admin`
- `/frontend-plan`

Default local login (seeded by API): `admin@vetpro.local` / `password123`.


### Realtime

- `GET /api/realtime/events` (SSE stream, authenticated)
