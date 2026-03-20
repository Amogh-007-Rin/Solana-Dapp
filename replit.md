# Root-Chain

A Solana-powered protocol for verified, high-liquidity carbon sequestration (hackathon project).

## Architecture

Three services run concurrently:

| Service | Directory | Port | Workflow |
|---------|-----------|------|----------|
| Next.js web app | `sol-dapp-web/` | 5000 | Start application |
| Node/Express secondary backend | `sb-server/` | 8080 | Secondary Backend |
| Python FastAPI AI oracle | `ai-engine/` | 8000 | AI Engine |

## Starting

All three workflows auto-start. The web app is the main preview (port 5000).

## Environment Variables

### sol-dapp-web/.env.local
- `NEXT_PUBLIC_SOLANA_RPC_URL` — Solana RPC endpoint (defaults to Devnet)
- `NEXT_PUBLIC_AI_ENGINE_URL` — AI engine URL (http://127.0.0.1:8000)
- `NEXT_PUBLIC_SB_SERVER_URL` — Secondary backend URL (http://127.0.0.1:8080)
- `NEXT_PUBLIC_PROGRAM_ID` — Deployed Anchor program ID
- `NEXT_PUBLIC_CO2_MINT` — Token-2022 CO2 mint address (required for minting)
- `NEXTAUTH_URL` — Auth callback URL
- `NEXTAUTH_SECRET` — NextAuth JWT secret (set a strong random value)
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — Optional: Google OAuth (NextAuth)
- `FIRST_ADMIN_EMAIL` — Email that gets admin role automatically on first login

### ai-engine/.env
- `ORACLE_PRIVATE_KEY` — 32 or 64 byte hex-encoded Solana keypair seed (required)

### sb-server/.env
- `PORT=8080`

## Key Notes

- User data is stored in-memory only (resets on restart) — fine for hackathon demo
- Solana program is on Devnet; users need a Phantom wallet set to Devnet
- The AI oracle uses mock NDVI data (no real satellite API needed for demo)
- Google OAuth is optional; app works without it (no auth providers = no social login)
