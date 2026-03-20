# Root-Chain Implementation Report

## 1. Project Status Overview

This repository has moved from scaffold-only to a functional multi-service prototype across all core layers:

- On-chain program (Anchor): implemented core account model and instructions.
- AI oracle service (FastAPI): implemented biomass simulation and signature generation.
- Secondary backend (Node.js): implemented webhook indexing, cache, and websocket broadcast.
- Web app (Next.js): implemented a clean operator dashboard with wallet actions and on-chain transaction flows.
- Mobile app (Expo): implemented wallet connect + geolocation capture flow skeleton.

The core vertical slice now exists end-to-end:

1. Register farm account.
2. Request AI verification.
3. Build + send mint flow using oracle signature.
4. Retire credits using on-chain retire instruction.
5. Emit retire events for indexer ingestion.

---

## 2. What Has Been Implemented So Far

## 2.1 Solana Program (sol-program)

Implemented in [sol-program/src/lib.rs](sol-program/src/lib.rs):

- Anchor program module with:
	- register_farm
	- mint_carbon_credits
	- retire_credits
- FarmAccount state:
	- owner
	- area_geojson
	- last_mint_timestamp
	- total_carbon_sequestered
	- amount_carbon
	- last_update
	- is_active
	- bump
- PDA strategy:
	- Farm PDA: seeds ["farm", owner]
	- Mint authority PDA: seeds ["mint-authority"]
- Oracle signature verification:
	- Parses Ed25519 instruction from instruction sysvar.
	- Verifies pubkey, signature, and message payload.
- Token-2022 mint and burn CPI usage.
- CarbonRetired event emission.

Implemented in [sol-program/Cargo.toml](sol-program/Cargo.toml):

- Anchor dependencies added.
- crate-type updated for Anchor program output.

Implemented in [sol-program/Anchor.toml](sol-program/Anchor.toml):

- Devnet provider config.

Important fix completed:

- Oracle message verification now matches AI service payload format (farm PDA based), so claim flow logic is consistent with signed message construction.

---

## 2.2 AI Oracle Service (ai-engine)

Implemented in [ai-engine/app.py](ai-engine/app.py):

- FastAPI app with CORS enabled.
- Env-based oracle key loading.
- Mock NDVI generation by coordinates.
- Carbon amount calculation.
- Endpoints:
	- GET /
	- POST /calculate
	- POST /verify-biomass
- Signature response payload includes:
	- amount_carbon
	- slot_number
	- oracle_pubkey
	- signature_hex
	- message_hex
	- ndvi_previous/current

Implemented support files:

- [ai-engine/requirements.txt](ai-engine/requirements.txt)
- [ai-engine/.env.example](ai-engine/.env.example)

---

## 2.3 Secondary Backend (sb-server)

Implemented in [sb-server/src/index.ts](sb-server/src/index.ts):

- Express server setup.
- Health endpoint: /server/health
- Metrics endpoint: /metrics/global-offset
- Helius-style webhook endpoint: /webhooks/solana
- Event parsing for CarbonRetired and CarbonMinted.
- In-memory cache:
	- totalCarbonLocked
	- totalCarbonRetired
	- totalEvents
- JSON event ledger persistence in data/offset-events.json.
- Socket.IO broadcast events:
	- NEW_OFFSET
	- NEW_MINT
	- CACHE_SNAPSHOT on connect

Implemented support files:

- [sb-server/package.json](sb-server/package.json)
- [sb-server/.env.example](sb-server/.env.example)

---

## 2.4 Web App (sol-dapp-web)

Implemented architecture and providers:

- Wallet provider integration in [sol-dapp-web/app/providers.tsx](sol-dapp-web/app/providers.tsx)
- Root integration in [sol-dapp-web/app/layout.tsx](sol-dapp-web/app/layout.tsx)

Implemented dashboard UI and flows in [sol-dapp-web/app/page.tsx](sol-dapp-web/app/page.tsx):

- Wallet connect UI.
- Farm PDA derivation.
- CO2 mint env awareness.
- Register Farm action (on-chain instruction).
- Claim Credits action:
	- Calls AI endpoint via Next API proxy.
	- Ensures ATA exists.
	- Adds Ed25519 verify instruction.
	- Adds mint_carbon_credits instruction.
	- Sends transaction through wallet.
- Retire Credits action:
	- Adds retire_credits instruction.
	- Sends transaction through wallet.
- Service Health panel with API-backed status checks.

Implemented API routes:

- [sol-dapp-web/app/api/health/route.ts](sol-dapp-web/app/api/health/route.ts)
- [sol-dapp-web/app/api/status/route.ts](sol-dapp-web/app/api/status/route.ts)
- [sol-dapp-web/app/api/oracle/calculate/route.ts](sol-dapp-web/app/api/oracle/calculate/route.ts)
- [sol-dapp-web/app/api/actions/retire/route.ts](sol-dapp-web/app/api/actions/retire/route.ts)

Implemented shared program instruction utilities in [sol-dapp-web/lib/program-instructions.ts](sol-dapp-web/lib/program-instructions.ts):

- Anchor discriminator-based instruction serialization.
- Register, mint, retire instruction builders.
- PDA derivation helpers.
- Token-2022 ATA helpers.

Implemented supporting files:

- [sol-dapp-web/lib/oracle.ts](sol-dapp-web/lib/oracle.ts)
- [sol-dapp-web/app/error.tsx](sol-dapp-web/app/error.tsx)
- [sol-dapp-web/app/globals.css](sol-dapp-web/app/globals.css)
- [sol-dapp-web/.env.example](sol-dapp-web/.env.example)

---

## 2.5 Mobile App (sol-dapp-app)

Implemented in [sol-dapp-app/app/(tabs)/index.tsx](sol-dapp-app/app/(tabs)/index.tsx):

- Solana mobile wallet connection using transact.
- GPS capture using expo-location.
- Register Farm UI scaffold.

Implemented support files:

- [sol-dapp-app/package.json](sol-dapp-app/package.json)
- [sol-dapp-app/.env.example](sol-dapp-app/.env.example)

---

## 2.6 Deployment and Documentation

- Deployment script scaffold in [deploy.sh](deploy.sh)
- Updated planning trackers:
	- [project-execution.md](project-execution.md)
	- [project-implementation-checklist.md](project-implementation-checklist.md)
- Updated project README in [Readme.md](Readme.md)

---

## 3. Validation Completed

Successful checks completed during implementation:

1. Web app: npm run build (passes).
2. SB server: npm install + npm run build (passes).
3. Mobile app: npm install + npm run lint (passes).
4. Solana program: cargo check (passes; editor warnings remain for Anchor macro cfg diagnostics but compile is successful).

---

## 4. Current Gaps / Remaining Work

1. Token-2022 advanced extensions are not fully implemented yet:
	 - metadata pointer and full retirement certificate lifecycle are not complete.
2. IDL generation and strict Anchor client integration are not finalized:
	 - direct instruction serialization is currently used in web.
3. Web dashboard does not yet fetch and render decoded FarmAccount state from chain.
4. SB-server is not yet decoding Anchor events from transaction logs with an IDL-based parser.
5. Mobile registration currently captures data but does not submit the real on-chain register transaction.
6. Camera proof-of-land feature is not yet implemented.
7. Integrated E2E test script for all services is not yet built.

---

## 5. Sequential Next Steps (Execute In Order)

## Step 1: Finalize Environment and Runtime Wiring

1. Create .env files from examples for ai-engine, sb-server, sol-dapp-web, sol-dapp-app.
2. Set required values:
	 - ORACLE_PRIVATE_KEY
	 - NEXT_PUBLIC_PROGRAM_ID
	 - NEXT_PUBLIC_CO2_MINT
	 - NEXT_PUBLIC_SOLANA_RPC_URL
	 - NEXT_PUBLIC_AI_ENGINE_URL
	 - NEXT_PUBLIC_SB_SERVER_URL
3. Start services and verify health endpoints:
	 - AI: /
	 - SB: /server/health
	 - Web: /api/status

## Step 2: Generate and Lock Program IDL

1. Run anchor build in sol-program.
2. Export the generated IDL JSON into web and sb-server integration layers.
3. Replace hardcoded discriminators in web helper with IDL-driven coder logic where possible.

## Step 3: Complete Token-2022 Asset Architecture

1. Initialize production-ready CO2 mint setup with authority rules.
2. Add metadata pointer and credit metadata model (vintage, location, provenance).
3. Add robust account existence checks and admin setup scripts.

## Step 4: Complete Web On-Chain Read Layer

1. Add FarmAccount fetch + decode and show live account state.
2. Add token balance fetch for owner ATA.
3. Add transaction history and status display panels.
4. Add toast notifications and error classification (wallet reject, rpc failure, instruction failure).

## Step 5: Upgrade Retire and Certificate Flow

1. Finalize retire event indexing contract side if additional events are needed.
2. Implement certificate issuance path (soulbound/non-transferable representation) after retirement.
3. Add certificate display and verification endpoint/UI.

## Step 6: SB-Server Event Decoding Hardening

1. Parse logs using Anchor IDL instead of only webhook payload shape assumptions.
2. Add durable storage option (SQLite/Postgres) replacing JSON file.
3. Add reconnect-safe websocket stream for frontend subscribers.

## Step 7: Finish Mobile On-Chain Integration

1. Submit real register_farm transaction from mobile app.
2. Add claim and retire actions on mobile.
3. Add camera-based proof upload/hash flow.

## Step 8: Integration Testing and Demo Hardening

1. Create local orchestration scripts for all services.
2. Add smoke tests:
	 - register -> claim -> retire -> webhook seen.
3. Add demo reset scripts for repeatable hackathon runs.

## Step 9: Production Readiness Pass

1. Add secret handling improvements and key rotation strategy.
2. Add rpc failover, retry, and timeout policies.
3. Add telemetry/logging standards across all services.
4. Add final judge-ready walkthrough documentation.

---

## 6. Immediate Priority Recommendation

If continuing now, the most important next sequence is:

1. Step 1 (env/runtime wiring),
2. Step 2 (IDL generation),
3. Step 4 (web read layer),
4. Step 6 (event decoding hardening),
5. Step 7 (mobile on-chain completion).

This gives you the fastest path to a stable end-to-end demo where every major action is verifiable and visible.
