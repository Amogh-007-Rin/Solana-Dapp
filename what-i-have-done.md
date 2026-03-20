# Root-Chain Implementation Report (Updated)

## 1. Project Status Overview

This repository has progressed from scaffold-level to a working multi-service prototype with authenticated web operations and database-backed user persistence.

Current implementation status across layers:

- On-chain program (Anchor): core account/instruction flow implemented.
- AI oracle service (FastAPI): biomass simulation + signed payload generation implemented.
- Secondary backend (Node.js): webhook ingestion, cache aggregation, and websocket push implemented.
- Web app (Next.js): custom landing/login/dashboard flow with Google SSO, protected routes, wallet actions, and admin role tooling implemented.
- Mobile app (Expo): wallet + geolocation capture scaffold implemented.

The core product flow now supports:

1. Wallet-driven farm registration.
2. Oracle-assisted credit claim flow.
3. Credit retirement flow with event emission.
4. Google-authenticated dashboard access.
5. Role-based user administration (admin/operator/auditor) with role audit logs.

---

## 2. What Has Been Implemented So Far

## 2.1 Solana Program (`sol-program`)

Implemented in [sol-program/src/lib.rs](sol-program/src/lib.rs):

- Program instructions:
  - `register_farm`
  - `mint_carbon_credits`
  - `retire_credits`
- `FarmAccount` state with owner/location/activity/carbon tracking fields.
- PDA derivation strategy:
  - Farm PDA: seeds `["farm", owner]`
  - Mint authority PDA: seeds `["mint-authority"]`
- Oracle signature verification via Ed25519 instruction parsing from instruction sysvar.
- Token-2022 mint/burn CPI usage.
- `CarbonRetired` event emission.

Implemented in [sol-program/Cargo.toml](sol-program/Cargo.toml):

- Anchor dependencies and crate output configuration.

Implemented in [sol-program/Anchor.toml](sol-program/Anchor.toml):

- Devnet provider setup.

Important compatibility work completed:

- Oracle message verification path aligned with AI service message construction format.

---

## 2.2 AI Oracle Service (`ai-engine`)

Implemented in [ai-engine/app.py](ai-engine/app.py):

- FastAPI app + CORS.
- Environment-based oracle key loading.
- Coordinate-based mock NDVI generation.
- Carbon amount computation.
- Endpoints:
  - `GET /`
  - `POST /calculate`
  - `POST /verify-biomass`
- Signed response payload includes:
  - `amount_carbon`
  - `slot_number`
  - `oracle_pubkey`
  - `signature_hex`
  - `message_hex`
  - NDVI inputs/outputs.

Support files:

- [ai-engine/requirements.txt](ai-engine/requirements.txt)
- [ai-engine/.env.example](ai-engine/.env.example)

---

## 2.3 Secondary Backend (`sb-server`)

Implemented in [sb-server/src/index.ts](sb-server/src/index.ts):

- Express server bootstrap.
- Health endpoint: `/server/health`
- Metrics endpoint: `/metrics/global-offset`
- Webhook endpoint: `/webhooks/solana`
- Event handling for retired/minted shapes.
- In-memory aggregate cache:
  - total locked
  - total retired
  - total events
- JSON persistence ledger in `data/offset-events.json`.
- Socket.IO broadcast events:
  - `NEW_OFFSET`
  - `NEW_MINT`
  - `CACHE_SNAPSHOT` on connect

Support files:

- [sb-server/package.json](sb-server/package.json)
- [sb-server/.env.example](sb-server/.env.example)

---

## 2.4 Web App (`sol-dapp-web`)

### 2.4.1 Wallet + Dashboard Transaction Flows

Implemented foundation and Solana actions across:

- [sol-dapp-web/app/page.tsx](sol-dapp-web/app/page.tsx)
- [sol-dapp-web/lib/program-instructions.ts](sol-dapp-web/lib/program-instructions.ts)
- [sol-dapp-web/lib/oracle.ts](sol-dapp-web/lib/oracle.ts)

Capabilities implemented:

- Wallet connect UX and farm PDA derivation.
- Register farm instruction build/send.
- Claim credits flow:
  - oracle API call through app route
  - ATA creation checks
  - ed25519 verify instruction insertion
  - mint instruction send
- Retire credits flow:
  - retire instruction send
- Service health/status integrations.

### 2.4.2 Auth, Access Control, and UX Restructure

Implemented major auth/UI upgrade:

- Custom landing page for unauthenticated entry.
- Dedicated login page.
- Post-login dashboard redirection.
- Protected dashboard access via session checks.

Key files:

- [sol-dapp-web/app/page.tsx](sol-dapp-web/app/page.tsx)
- [sol-dapp-web/app/login/page.tsx](sol-dapp-web/app/login/page.tsx)
- [sol-dapp-web/app/dashboard/page.tsx](sol-dapp-web/app/dashboard/page.tsx)
- [sol-dapp-web/app/dashboard/dashboard-client.tsx](sol-dapp-web/app/dashboard/dashboard-client.tsx)

SSO implementation (Google-only):

- [sol-dapp-web/app/api/auth/[...nextauth]/route.ts](sol-dapp-web/app/api/auth/[...nextauth]/route.ts)
- [sol-dapp-web/lib/auth.ts](sol-dapp-web/lib/auth.ts)
- [sol-dapp-web/app/social-login-buttons.tsx](sol-dapp-web/app/social-login-buttons.tsx)
- [sol-dapp-web/types/next-auth.d.ts](sol-dapp-web/types/next-auth.d.ts)

### 2.4.3 Admin Role Management + Audit Trail

Implemented admin scope with role updates and audit browsing:

- Admin page/UI:
  - [sol-dapp-web/app/admin/page.tsx](sol-dapp-web/app/admin/page.tsx)
  - [sol-dapp-web/app/admin/admin-users-client.tsx](sol-dapp-web/app/admin/admin-users-client.tsx)
- User APIs:
  - [sol-dapp-web/app/api/users/list/route.ts](sol-dapp-web/app/api/users/list/route.ts)
  - [sol-dapp-web/app/api/users/me/route.ts](sol-dapp-web/app/api/users/me/route.ts)
  - [sol-dapp-web/app/api/users/role/route.ts](sol-dapp-web/app/api/users/role/route.ts)
- Role audit API:
  - [sol-dapp-web/app/api/audit/roles/route.ts](sol-dapp-web/app/api/audit/roles/route.ts)

---

## 2.5 Prisma Persistence Migration (`sol-dapp-web`)

Persistence was upgraded from JSON-file storage to Prisma-backed database models.

Implemented data layer:

- Prisma schema:
  - [sol-dapp-web/prisma/schema.prisma](sol-dapp-web/prisma/schema.prisma)
- Prisma client singleton:
  - [sol-dapp-web/lib/db.ts](sol-dapp-web/lib/db.ts)
- User/audit store abstraction migrated:
  - [sol-dapp-web/lib/user-store.ts](sol-dapp-web/lib/user-store.ts)

Current modeled entities:

- `User`
- `RoleAudit`
- `UserRole` enum (`operator`, `admin`, `auditor`)

Environment/docs support updated:

- [sol-dapp-web/.env.example](sol-dapp-web/.env.example)

---

## 2.6 Mobile App (`sol-dapp-app`)

Implemented in [sol-dapp-app/app/(tabs)/index.tsx](sol-dapp-app/app/(tabs)/index.tsx):

- Solana mobile wallet connect scaffold.
- Geolocation capture flow.
- Register farm UI structure.

Support files:

- [sol-dapp-app/package.json](sol-dapp-app/package.json)
- [sol-dapp-app/.env.example](sol-dapp-app/.env.example)

---

## 2.7 Documentation and Runbooks

Created/updated:

- [what-i-have-done.md](what-i-have-done.md)
- [running-instructions.md](running-instructions.md)
- [project-execution.md](project-execution.md)
- [project-implementation-checklist.md](project-implementation-checklist.md)
- [Readme.md](Readme.md)

---

## 3. Validation Completed

The following checks were confirmed in implementation cycles:

1. `sol-dapp-web`: `npm run build` passes.
2. `sb-server`: install/build passes.
3. `sol-dapp-app`: install/lint passes.
4. `sol-program`: `cargo check` passes (Anchor macro diagnostics in editor may still appear).

---

## 4. Current Gaps / Active Blockers

1. OAuth runtime depends on correct Google Cloud Console setup (authorized origins + callback URI).
2. Prisma runtime currently blocked in latest state by remote Postgres connectivity (`P1001`) when targeting cloud DB.
3. Local Postgres bring-up and `DATABASE_URL` pivot are pending finalization.
4. Farm account decode/read panels in web are still incomplete.
5. SB server still relies on payload-shape parsing, not full IDL log decoding.
6. Mobile app does not yet submit full on-chain register/claim/retire flows.
7. Token-2022 advanced metadata/certificate lifecycle is not finalized.

---

## 5. Sequential Next Steps (Updated, Immediate-First)

## Step 1: Stabilize Local Database Path (Highest Priority)

1. Start local Postgres via root `docker-compose.yml`.
2. Point [sol-dapp-web/.env](sol-dapp-web/.env) `DATABASE_URL` to local container.
3. Run Prisma sync (`generate` + `migrate dev` or `db push`).
4. Verify sign-in persists user records and role audits without Prisma errors.

## Step 2: Finalize Google OAuth Runtime Configuration

1. Ensure Google OAuth app includes:
   - authorized JavaScript origin (`http://localhost:3000`)
   - authorized redirect URI (`http://localhost:3000/api/auth/callback/google`)
2. Re-test login redirect and dashboard session continuity.

## Step 3: Web Read Layer Completion

1. Add on-chain `FarmAccount` read/decode panel.
2. Add owner ATA/token balance panel.
3. Add transaction history/state UX for register/claim/retire.

## Step 4: Event Pipeline Hardening

1. Move webhook event parsing to IDL-based decoding where feasible.
2. Replace JSON event storage with durable DB-backed persistence.
3. Add reconnect-safe websocket replay strategy.

## Step 5: Mobile On-Chain Completion

1. Send real `register_farm` transaction from mobile.
2. Add claim and retire actions to mobile UX.
3. Add camera proof capture/hash path.

## Step 6: Token-2022 and Certificate Lifecycle

1. Finalize metadata pointer strategy.
2. Implement retirement certificate issuance model.
3. Add certificate validation/display endpoints and UI.

## Step 7: Integration and Demo Hardening

1. Add local orchestration scripts for all services.
2. Add smoke test for register -> claim -> retire -> webhook path.
3. Add deterministic demo reset utilities.

---

## 6. Immediate Execution Recommendation

Run this sequence next for fastest stabilization:

1. Step 1 (local DB bring-up + Prisma sync)
2. Step 2 (Google OAuth callback verification)
3. Step 3 (web read layer)
4. Step 4 (event hardening)
5. Step 5 (mobile on-chain completion)

This order unblocks auth persistence first, then restores focus to chain observability and demo completeness.
