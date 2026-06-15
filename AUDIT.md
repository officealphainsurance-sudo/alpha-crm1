# Alpha Insurance CRM — Phase 1 Audit

**Date:** 2026-06-13  
**Auditor:** Claude (Sonnet 4.6)  
**Project:** Alpha Insurance Agency CRM — Fork of Atomic CRM  
**Supabase Project:** erfjiutywidyfylesjgn.supabase.co

---

## 1. Codebase Origin

Forked from `marmelab/atomic-crm`. Base stack: React 19 + TypeScript + Vite + ra-core (react-admin headless) + shadcn-admin-kit + Supabase. The fork preserves the full data layer and admin framework while replacing all domain objects with insurance-specific equivalents.

---

## 2. Domain Reshaping Summary

| Atomic CRM Object | Alpha Insurance Object | Supabase Table      |
|-------------------|------------------------|---------------------|
| Contacts          | Clients                | `clients`           |
| Companies         | Carriers               | `carriers` (new)    |
| Deals             | Pipeline               | `pipeline` (new)    |
| Tasks             | Follow-Ups             | `follow_ups` (new)  |
| Notes             | Contact Log            | `contact_logs`      |
| —                 | Call Logs              | `call_logs` (new)   |

All original Atomic CRM resources (`contacts`, `companies`, `deals`, `tasks`, `tags`, `deal_notes`, `contact_notes`) have been removed from the resource registry.

---

## 3. Files Created or Modified

### New Domain Layer (`src/components/alpha-crm/`)

| File | Purpose |
|------|---------|
| `types.ts` | Full TypeScript interfaces for Client, Carrier, PipelineRecord, FollowUp, ContactLog, Lead. Includes OUTCOME_NEXT_DAY_OFFSETS, STATUS_COLORS, PRIORITY_COLORS, URGENCY_COLORS. |
| `utils.ts` | formatPhone, formatCurrency, formatDate, formatDateShort, formatRelativeDate, isPastDate, isWithinDays |
| `clients/ClientList.tsx` | Tabbed list (All/Active/At Risk/Lapsed/Cancelled), live search, sortable table, click-to-Sheet detail |
| `clients/ClientShow.tsx` | Detail Sheet: contact info, policy info, quick actions (Call/Email), contact log timeline |
| `clients/ClientCreate.tsx` | Create form Sheet with all client fields |
| `clients/index.ts` | Resource export with Users icon |
| `carriers/CarrierList.tsx` | Card grid with portal links, AM contact info, commission rate |
| `carriers/CarrierCreate.tsx` | Create form Sheet |
| `carriers/index.ts` | Resource export with Building2 icon |
| `pipeline/PipelineKanban.tsx` | Drag-and-drop Kanban (Open/Quoted/Won/Lost) via @hello-pangea/dnd |
| `pipeline/index.ts` | Resource export with TrendingUp icon |
| `follow-ups/FollowUpList.tsx` | Sectioned view (Overdue/Today/Upcoming/Completed), inline outcome logging with auto-next-date |
| `follow-ups/index.ts` | Resource export with ClipboardList icon |
| `activity-log/ActivityLogList.tsx` | Unified feed grouped by date, filterable by interaction type |
| `activity-log/index.ts` | Resource export with Activity icon |
| `dashboard/AlphaDashboard.tsx` | 4 KPI cards (Active Clients, Monthly Premium, At Risk/Lapsed, Follow-Ups Due), today's queue, book composition bar chart, recent activity feed |

### Modified Files

| File | Change |
|------|--------|
| `src/index.css` | Alpha Insurance brand tokens: burgundy primary (#7B1C2A → oklch), dark sidebar (#170810), Playfair Display font var, client status custom properties |
| `index.html` | Title → "Alpha Insurance CRM", theme-color → #7B1C2A, Playfair Display Google Fonts |
| `src/components/admin/app-sidebar.tsx` | "Acme Inc." / Shell icon → "ALPHA / Insurance Agency" with Playfair Display |
| `src/components/atomic-crm/root/defaultConfiguration.ts` | All config replaced: insurance sectors, deal stages, note statuses, task types |
| `src/components/atomic-crm/root/CRM.tsx` | Resources replaced with alpha-crm equivalents; AlphaDashboard as default |

### New Infrastructure

| File | Purpose |
|------|---------|
| `.env.local` | VITE_SUPABASE_URL, VITE_SB_PUBLISHABLE_KEY, VITE_ATTACHMENTS_BUCKET |
| `.env.example` | Template for new environments (no values) |
| `public/_redirects` | Netlify SPA fallback: `/* /index.html 200` |
| `public/logos/logo_alpha_insurance.svg` | Dark-sidebar SVG logo (cream text) |
| `public/logos/logo_alpha_light.svg` | Light-mode SVG logo (burgundy text) |
| `supabase/migrations/20260613000000_alpha_insurance_tables.sql` | Creates carriers, pipeline, follow_ups, call_logs with RLS policies + indexes |

---

## 4. Existing Alpha Insurance Supabase Tables (preserved)

The following tables exist in the remote Supabase project and were NOT modified:

- `clients` — primary client book of business
- `contact_logs` — interaction history per client
- `leads` — lead pipeline (separate from pipeline kanban)
- `sms_queue` — outbound SMS queue
- `stop_list` — opt-out / DNC list

---

## 5. Security Checklist

- [x] No credentials hardcoded — all in `.env.local` (gitignored)
- [x] `.env.example` committed with placeholder values only
- [x] Supabase RLS enabled on all new tables
- [x] Authenticated-only policies on all new tables (select, insert, update)
- [x] No `dangerouslySetInnerHTML` usage in any new component
- [x] Payment routing: no automated payment handling — per hard rules, payment inquiries route to Amanda Frizell
- [x] `DRY_RUN` default respected — no bulk automation implemented without explicit flag
- [x] `opt_out` field on clients respected — no outbound logic ignores it

---

## 6. Hard Rules Compliance

| Rule | Status |
|------|--------|
| Credentials never hardcoded | ✅ All in `.env.local` |
| Supabase is single source of truth | ✅ No localStorage for client data |
| Payment inquiries → Amanda | ✅ No automated payment flow implemented |
| UI uses insurance terminology | ✅ Clients / Carriers / Pipeline / Follow-Ups throughout |
| DRY_RUN defaults to true | ✅ No automation implemented without flag |

---

## 7. What Is NOT Yet Done (Phase 2+)

- CSV import for clients (status normalization: ACTIVE EFT→ACTIVE, etc.)
- Retell AI integration
- SMS queue / sms_queue write-through
- Leads view (separate from Pipeline Kanban)
- Client merge logic
- Settings page — Alpha Insurance configuration panel
- Full mobile layout optimization
- Edge Functions for follow-up auto-scheduling (currently client-side only)
- Netlify build environment variables (must be set in Netlify dashboard)

---

## 8. TypeScript

`npx tsc --noEmit` — exit code 0, zero errors as of 2026-06-13.
