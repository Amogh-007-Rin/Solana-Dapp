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

## Demo Credentials

All demo accounts use password: `demo`

| Email | Role | Redirect |
|-------|------|----------|
| farmer@demo.com | Farmer / Agriculturist | /dashboard/farmer |
| industrialist@demo.com | Industrialist / Buyer | /dashboard/industrialist |
| admin@demo.com | Admin | /admin |

## Key Features

### Login
- Credential-based demo login (no Google OAuth required)
- Role-based dual login screen: Farmer vs Industrialist
- Quick-access demo login buttons on login page

### Farmer Dashboard
- Land registration form with Phantom wallet integration
- 7-step geo-verification flow with animated SVG geo-map
- Satellite NDVI scan animation (polygon drawing, scan line, data pings)
- NFT certificate card (blockchain-style, gradient, metadata)
- Carbon credits card with mint address, transfer status, market links

### Industrialist Dashboard
- Carbon credit market overview with 3 tabs (Markets/Portfolio/Orders)
- Portfolio P&L with sparklines per market
- Credit retirement CTA with ESG compliance flow

### Trade Desk (/marketplace/trade)
- Backpack.exchange/Polymarket-inspired dark terminal design
- Real-time order book (asks/bids with depth bars)
- Price chart with sparkline rendering
- Live simulated trades feed
- Buy/Sell order form with market/limit toggle
- Farmer sell listing form

### Admin Console (/admin)
- User management with role/participant type controls
- Platform statistics

## Environment Variables

### sol-dapp-web/.env.local
- `NEXT_PUBLIC_SOLANA_RPC_URL` — Solana RPC endpoint (defaults to Devnet)
- `NEXT_PUBLIC_AI_ENGINE_URL` — AI engine URL (http://127.0.0.1:8000)
- `NEXT_PUBLIC_SB_SERVER_URL` — Secondary backend URL (http://127.0.0.1:8080)
- `NEXT_PUBLIC_PROGRAM_ID` — Deployed Anchor program ID
- `NEXT_PUBLIC_CO2_MINT` — Token-2022 CO2 mint address (required for real minting)
- `NEXTAUTH_URL` — Auth callback URL
- `NEXTAUTH_SECRET` — NextAuth JWT secret
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — Optional: Google OAuth
- `FIRST_ADMIN_EMAIL=admin@demo.com` — Gets admin role automatically

### ai-engine/.env
- `ORACLE_PRIVATE_KEY` — 32 or 64 byte hex-encoded Solana keypair seed

### sb-server/.env
- `PORT=8080`

## Key Notes

- Auth: NextAuth v4 with CredentialsProvider (demo accounts) + optional Google OAuth
- User data is stored in-memory only (resets on restart) — fine for hackathon demo
- Solana program is on Devnet; users need a Phantom wallet set to Devnet
- The AI oracle uses mock NDVI data (no real satellite API needed for demo)
- Wallet hydration: FarmerDashboardClient uses `mounted` state guard to avoid SSR mismatch
- Design: Backpack.exchange + Polymarket dark theme (#020817 bg, dot grid, emerald/cyan/amber palette)
