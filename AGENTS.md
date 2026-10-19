<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Ponytail: Lazy Senior Dev Rules (Anti-Overengineering)

Before writing, generating, or modifying any code, evaluate the task using the decision ladder:
1. **Does this need to exist?** Can the request be solved with zero new code or zero new files?
2. **Reuse existing code:** Inspect the repository first. Never reinvent utilities, UI components, or helpers that already exist in this project.
3. **Native first:** Never install a third-party library or npm package if a standard Web/JS API (HTML5 inputs, native fetch, Intl, native CSS) solves the problem.
4. **Minimal diff:** Produce the absolute minimum line changes needed. Do not introduce abstractions, generic handlers, or refactors unless strictly requested.
5. **Safety invariant:** Never remove security checks, sanitization, validation, or error handling to save lines.

---

# OkulSonrası.com — Core Architecture & Domain Rules

## 1. Multi-Tenant Architecture & Database Security
- **SaaS Isolation:** Every table in the database must include `tenant_id`.
- **Row Level Security (RLS):** RLS must always be active on all tenant-facing tables. A tenant must never read or modify another tenant's students, balances, transactions, or attendances.
- **Admin/Super-Admin Separation:** Super admin routes (`/super-admin`) are strictly guarded via JWT `app_metadata.role === 'super_admin'`.

## 2. Kiosk & Entrance Screen Standards
- **Display Optimization:** The Kiosk screen (`/kiosk`) must be 100% full-screen responsive for 1080p touch monitors and tablets.
- **Auto-Reset Lifecycle:** Upon QR scan or PIN entry, display the success state for 3 seconds, then automatically reset via React state. Never trigger page reloads (F5).
- **Scanner Hygiene:** Stop and clear `html5-qrcode` streams properly to prevent memory leaks and camera lockups.

## 3. Security, Privacy & Error Handling
- **Parent Tracking Privacy:** Never expose predictable UUIDs in parent tracking URLs. Always use secure, random tracking tokens (`/veli/takip/[token]`).
- **User Feedback:** Use `try-catch` blocks and user-friendly toast notifications (`sonner`) across all API and database interactions.
- **Payment & WhatsApp Deduplication:** Use `lib/whatsapp.ts` for messaging and maintain PayTR as primary with Iyzico as fallback. Do not add bloat libraries.
